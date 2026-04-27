const db       = require('../config/database');
const tables   = require('../config/tables');
const esClient = require('../config/elasticsearch');
require('dotenv').config();

// Index names (match what PHP app uses)
const ES_YT_INDEX = process.env.ES_YT_INDEX || 'bmi_light_ims';

const TABLE_NAME    = process.env.DB_TABLE_NAME    || tables.LIGHT_IMS;
const STATUS_COLUMN = process.env.DB_STATUS_COLUMN || tables.COLUMN_MAPPINGS.STATUS_COLUMN_CHANNEL_DATA;

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Serialize MySQL row for ES — converts Buffers, Dates, strips nulls
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ES FIELD TYPE MAPS — derived from GET bmi_light_ims/_mapping
// ─────────────────────────────────────────────────────────────────────────────

// Confirmed boolean type in ES mapping (tinyint → true/false)
const ES_BOOL_FIELDS = new Set([
  'avoidsearch', 'barter', 'closed', 'conemail_smtp',
  'negativekeywords', 'oldcontent', 'onehit', 'yt_email_smtp'
]);

// Date fields in ES with format "yyyy-MM-dd" — must NOT send ISO string
const ES_DATE_FIELDS = new Set([
  'added_date', 'conf_date', 'created_at',
  'last_updated', 'metrics_date', 'pricechangedon'
]);

// Object-mapped fields in ES — MySQL stores as JSON string, must parse
const ES_JSON_OBJECT_FIELDS = new Set([
  'tags',         // ES: object with niche sub-properties
  'top_two_tags', // ES: object with niche sub-properties
]);

// varchar fields mapped as integer in ES — parse to int, skip non-numeric
const ES_STRING_TO_INT_FIELDS = new Set([
  'inf_recommend',   // varchar(4) → ES integer
  'inf_promotions',  // varchar(4) → ES integer
]);

// Fields to skip — large text not useful for search, or complex nested
const ES_SKIP_FIELDS = new Set([
  'note',              // text — not for search
  'admin_note',        // text — not for search
  'yt_description',    // text — not for search
  'automation_language',// text — not for search
  'recent_videos',     // nested complex object — skip
]);

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZE MYSQL ROW → ES DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────
function serializeForES(row) {
  const doc = {};

  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) continue;
    if (ES_SKIP_FIELDS.has(key)) continue;

    // ── Buffer (binary MySQL columns) ────────────────────────────────────────
    if (Buffer.isBuffer(val)) {
      doc[key] = val.toString('utf8');
      continue;
    }

    // ── Date objects from MySQL ──────────────────────────────────────────────
    if (val instanceof Date) {
      // Invalid MySQL dates like 0000-00-00 — skip entirely
      const ts = val.getTime();
      if (isNaN(ts) || ts <= 0) continue;

      if (ES_DATE_FIELDS.has(key)) {
        // ES expects yyyy-MM-dd ONLY for these fields
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        doc[key] = `${y}-${m}-${d}`;
      } else {
        // Other date columns — send as ISO string (ES will auto-map)
        doc[key] = val.toISOString();
      }
      continue;
    }

    // ── Boolean fields: tinyint(1) → true/false ──────────────────────────────
    if (ES_BOOL_FIELDS.has(key)) {
      doc[key] = val === 1 || val === '1' || val === true;
      continue;
    }

    // ── JSON object fields: parse string → object ────────────────────────────
    if (ES_JSON_OBJECT_FIELDS.has(key)) {
      if (typeof val === 'object' && !Array.isArray(val)) {
        doc[key] = val; // already parsed
      } else if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed || trimmed === '{}' || trimmed === '[]'
            || trimmed === 'null' || trimmed === '""') continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            doc[key] = parsed;
          }
          // skip arrays, primitives — incompatible with ES object mapping
        } catch (_) {
          // invalid JSON — skip to avoid mapping conflict
        }
      }
      continue;
    }

    // ── varchar fields mapped as integer in ES ───────────────────────────────
    if (ES_STRING_TO_INT_FIELDS.has(key)) {
      const n = parseInt(val, 10);
      if (!isNaN(n)) doc[key] = n;
      // skip "NA", "", non-numeric
      continue;
    }

    // ── Regular objects ──────────────────────────────────────────────────────
    if (typeof val === 'object') {
      try { doc[key] = JSON.parse(JSON.stringify(val)); }
      catch (_) { doc[key] = String(val); }
      continue;
    }

    // ── Everything else: strings, integers, floats ───────────────────────────
    doc[key] = val;
  }

  return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: map confirmed number → status text
// ─────────────────────────────────────────────────────────────────────────────
function confirmedToText(confirmed) {
  const n = Number(confirmed);
  if (n === 1)  return 'Unconfirmed';
  if (n === 2)  return 'Auto Mail';
  if (n === 3)  return 'Manual Mail';
  if (n === 4)  return 'Responded';
  if (n === 5)  return 'Confirmed';
  if (n === 6)  return 'Managed';
  if (n === 7)  return 'Suspended';
  if (n === 9)  return 'BMI';
  if (n === 10) return 'Confirmed PPC';
  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: post-process rows (add status text + instagram batch)
// ─────────────────────────────────────────────────────────────────────────────
async function enrichRows(rows) {
  if (!rows.length) return rows;

  // 1. Admin notes count
  try {
    const channelIds  = [...new Set(rows.map(r => r.channel_id != null ? r.channel_id : r.id))];
    const placeholders = channelIds.map(() => '?').join(',');
    const [countRows] = await db.execute(
      `SELECT ${tables.ADMINNOTES.CHANNEL_ID_COLUMN} as channel_id, COUNT(*) as cnt 
       FROM ${tables.ADMINNOTES.TABLE} 
       WHERE ${tables.ADMINNOTES.CHANNEL_ID_COLUMN} IN (${placeholders}) 
       GROUP BY ${tables.ADMINNOTES.CHANNEL_ID_COLUMN}`,
      channelIds
    );
    const countMap = new Map(countRows.map(r => [r.channel_id, Number(r.cnt)]));
    rows.forEach(r => {
      r.admin_notes_count = countMap.get(r.channel_id != null ? r.channel_id : r.id) || 0;
    });
  } catch (err) {
    console.warn('Admin notes count failed:', err.message);
    rows.forEach(r => { r.admin_notes_count = 0; });
  }

  // 2. Instagram batch fetch (match light_ims.channel_name → instagram_data.name)
  try {
    const channelNames = [...new Set(rows.map(r => r.channel_name).filter(Boolean))];
    if (channelNames.length > 0) {
      const igPlaceholders = channelNames.map(() => '?').join(',');
      const [igRows] = await db.execute(
        `SELECT
           ig.id                    AS ig_id,
           ig.username,
           ig.name                  AS ig_name,
           ig.bio,
           ig.emails,
           ig.phone                 AS ig_phone,
           ig.website,
           ig.tags                  AS ig_tags,
           ig.tag_category          AS ig_tag_category,
           ig.followers,
           ig.following,
           ig.inf_score,
           ig.avg_likes,
           ig.avg_views             AS ig_avg_views,
           ig.engmnt_rate,
           ig.inf_price,
           ig.pitching_reel_price,
           ig.pitching_price,
           ig.pitching_post_price,
           ig.story_price,
           ig.pitching_story_price,
           ig.fair_price,
           ig.currency              AS ig_currency,
           ig.status                AS ig_status,
           ig.managedby             AS ig_managedby,
           ig.confirmed_on,
           ig.added_date            AS ig_added_date,
           ig.updated_date,
           ig.creditcost,
           ig.inf_promotions,
           (SELECT COUNT(*) FROM bmi.instagram_data_admin_notes
            WHERE instagram_user_id = ig.username)      AS ig_notes_count,
           (SELECT COUNT(*) FROM bmi.instagram_paid_partnership
            WHERE userprofile = ig.username)            AS has_partnership
         FROM bmi.instagram_data ig
         WHERE ig.name IN (${igPlaceholders})`,
        channelNames
      );
      const igMap = new Map();
      igRows.forEach(r => { if (!igMap.has(r.ig_name)) igMap.set(r.ig_name, r); });
      rows.forEach(r => { r.instagram = igMap.get(r.channel_name) || null; });
    }
  } catch (err) {
    console.warn('Instagram batch fetch failed:', err.message);
    rows.forEach(r => { r.instagram = null; });
  }

  // 3. Promotions count + latest date — only for channels in influencers_leaderboard
  try {
    const channels = [...new Set(rows.map(r => r.channel).filter(Boolean))];
    if (channels.length > 0) {
      const phs = channels.map(() => '?').join(',');
      const [promoRows] = await db.execute(
        `SELECT be.channel,
                COUNT(*) as promo_count,
                MAX(be.published_on) as latest_promo_date
         FROM bmi.brandsextraction be
         INNER JOIN bmi.influencers_leaderboard lb ON be.channel = lb.channel
         WHERE be.channel IN (${phs})
         GROUP BY be.channel`,
        channels
      );
      const promoMap = new Map(promoRows.map(r => [r.channel, {
        promo_count: Number(r.promo_count),
        latest_promo_date: r.latest_promo_date || null
      }]));
      rows.forEach(r => {
        const p = promoMap.get(r.channel);
        r.promo_count       = p ? p.promo_count       : null;
        r.latest_promo_date = p ? p.latest_promo_date : null;
      });
    }
  } catch (err) {
    console.warn('Promotions count failed:', err.message);
    rows.forEach(r => { r.promo_count = null; r.latest_promo_date = null; });
  }

  // 4. Map confirmed → status text
  return rows.map(row => {
    let statusText = confirmedToText(row.confirmed) || row.status || 'Unknown';
    if (row.status && typeof row.status === 'string' && row.status.toLowerCase().includes('not interested')) {
      statusText = 'Not Interested (WIP)';
    }
    return { ...row, status: statusText, confirmedValue: row.confirmed };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ELASTICSEARCH: build query params for getList
// ─────────────────────────────────────────────────────────────────────────────
function buildESQuery({ search, status, views, languages, emailFilter, barterFilter, excludeOldContent, dateFrom, dateTo, sortBy, page, limit }) {
  const from    = (parseInt(page) - 1) * parseInt(limit);
  const size    = parseInt(limit) || 20;
  const filters = [];
  const mustNot = [];

  const statusStr     = status ? String(status).trim().toLowerCase() : '';
  const isNotInterest = statusStr.includes('not interest') || Number(status) === 7;

  // ── closed: always exclude closed=1 (terminated channels) ─────────────────
  // ── avoidsearch: exclude from general browsing BUT skip when user searches
  //    by name — if someone types a specific channel name, show it regardless
  const hasSearch = !!(search && search.trim());

  if (!isNotInterest) {
    // Always filter out closed/terminated channels
    filters.push({
      bool: {
        should: [
          { term: { closed: false } },
          { bool: { must_not: [{ exists: { field: 'closed' } }] } }
        ],
        minimum_should_match: 1
      }
    });

    // Only apply avoidsearch when NOT doing a direct name search
    // avoidsearch=1 means "hide from general results" but searchable by name
    if (!hasSearch) {
      filters.push({
        bool: {
          should: [
            { term: { avoidsearch: false } },
            { bool: { must_not: [{ exists: { field: 'avoidsearch' } }] } }
          ],
          minimum_should_match: 1
        }
      });
    }
  }

  // ── Status: confirmed (int NOT NULL) values: 1-10 ───────────────────────────
  if (status !== undefined && status !== null && status !== '') {
    const st = Number(status);
    if      (st === 5 || statusStr === 'confirmed')                                               filters.push({ term: { confirmed: 5 } });
    else if (st === 1 || statusStr === 'unconfirmed')                                             filters.push({ term: { confirmed: 1 } });
    else if (st === 6 || statusStr === 'managed')                                                 filters.push({ term: { confirmed: 6 } });
    else if (st === 8 || statusStr === 'confirmed + managed' || statusStr === 'confirmed+managed') filters.push({ terms: { confirmed: [5, 6] } });
    else if (isNotInterest)                                                                       filters.push({ term: { confirmed: 7 } });
  }

  // ── Search: channel_name, name, yt_email, conemail (all varchar) ─────────────
  const mustClause = [];
  if (search && search.trim()) {
    mustClause.push({
      multi_match: {
        query:   search.trim(),
        fields:  ['channel_name', 'name', 'yt_email', 'conemail'],
        type:    'phrase_prefix',
        lenient: true
      }
    });
  }

  // ── Views: exposure (bigint NOT NULL) → ES long → plain range works ──────────
  if (views) {
    const viewsNum = parseInt(views, 10);
    if (!isNaN(viewsNum) && viewsNum > 0) {
      filters.push({ range: { exposure: { gte: viewsNum } } });
    }
  }

  // ── Language: language (varchar(50) NOT NULL) → ES text+keyword ─────────────
  // Use both term on keyword AND match on text field to be safe
  if (languages && languages.length > 0) {
    const langShould = languages.flatMap(lang => [
      { term:  { 'language.keyword': lang } },
      { match: { language: { query: lang, operator: 'and' } } }
    ]);
    filters.push({ bool: { should: langShould, minimum_should_match: 1 } });
  }

  // ── Email: yt_email / conemail (varchar(100) NOT NULL) ───────────────────────
  // These are NOT NULL varchar → empty string means no email.
  // Use wildcard "*" to match any non-empty value (works regardless of ES mapping type).
  if (emailFilter === 'Has Email') {
    filters.push({
      bool: {
        should: [
          { wildcard: { yt_email:  { value: '?*' } } },
          { wildcard: { conemail:  { value: '?*' } } }
        ],
        minimum_should_match: 1
      }
    });
  } else if (emailFilter === 'No Email') {
    // No email = yt_email is empty/missing AND conemail is empty/missing
    mustNot.push({ wildcard: { yt_email:  { value: '?*' } } });
    mustNot.push({ wildcard: { conemail:  { value: '?*' } } });
  }

  // ── Barter: tinyint(1) NOT NULL, 1=yes 2=no → ES maps as boolean ─────────────
  // Old PHP-indexed records: boolean true(yes) / false(no)
  // serializeForES converts: 1→true (yes), 2→false (no, since 2!==1)
  if (barterFilter === 'Yes') {
    filters.push({
      bool: {
        should: [
          { term: { barter: true  } },
          { term: { barter: 1     } }
        ],
        minimum_should_match: 1
      }
    });
  } else if (barterFilter === 'No') {
    filters.push({
      bool: {
        should: [
          { term: { barter: false } },
          { term: { barter: 0     } },
          { term: { barter: 2     } }   // MySQL value 2=no
        ],
        minimum_should_match: 1
      }
    });
  }

  // ── Exclude old content: oldcontent (tinyint(1)) + videos (int NOT NULL) ─────
  // oldcontent: 0=fresh, 1=old → ES boolean: false=fresh, true=old
  // Filter to show only fresh content (oldcontent=0/false) with videos > 0
  if (excludeOldContent) {
    filters.push({
      bool: {
        should: [
          { term: { oldcontent: false } },
          { term: { oldcontent: 0     } },
          { bool: { must_not: [{ exists: { field: 'oldcontent' } }] } }
        ],
        minimum_should_match: 1
      }
    });
    // videos (int NOT NULL) > 0
    filters.push({ range: { videos: { gt: 0 } } });
  }

  // ── Date range: added_date (datetime NOT NULL) ────────────────────────────────
  // MySQL stores as "2024-01-15 08:30:00" — ES date range handles this with format
  if (dateFrom || dateTo) {
    const rangeClause = { format: 'yyyy-MM-dd||yyyy-MM-dd HH:mm:ss' };
    if (dateFrom) rangeClause.gte = dateFrom;
    if (dateTo)   rangeClause.lte = dateTo + ' 23:59:59';
    filters.push({ range: { added_date: rangeClause } });
  }

  // ── Sort ──────────────────────────────────────────────────────────────────────
  const sortMap = {
    'Avg Views ASC':           { exposure:         { order: 'asc'  } },
    'Avg Views DESC':          { exposure:         { order: 'desc' } },
    'Subscribers':             { subscribers:      { order: 'desc' } },
    'New Channels':            { added_date:       { order: 'desc' } },
    'Latest Confirmed':        { conf_date:        { order: 'desc' } },
    'Last Updated':            { last_updated:     { order: 'desc' } },
    'Engagement Rate ASC':     { engagementrate:   { order: 'asc'  } },
    'Engagement Rate DESC':    { engagementrate:   { order: 'desc' } },
    'CPM Value ASC':           { price_view_ratio: { order: 'asc'  } },
    'CPM Value DESC':          { price_view_ratio: { order: 'desc' } },
    'Highly Recommended ASC':  { inf_recommend:    { order: 'asc'  } },
    'Highly Recommended DESC': { inf_recommend:    { order: 'desc' } },
    'Work History DESC':       { inf_promotions:   { order: 'desc' } },
    'Shorts Views ASC':        { shorts_avgviews:  { order: 'asc'  } },
    'Shorts Views DESC':       { shorts_avgviews:  { order: 'desc' } },
  };
  const sort = sortBy && sortMap[sortBy] ? [sortMap[sortBy]] : [{ id: { order: 'desc' } }];

  return {
    index: ES_YT_INDEX,
    from,
    size,
    track_total_hits: true,
    query: {
      bool: {
        must:     mustClause.length > 0 ? mustClause : [{ match_all: {} }],
        filter:   filters,
        must_not: mustNot
      }
    },
    sort,
    _source: true
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/test-db
// ─────────────────────────────────────────────────────────────────────────────
exports.testDatabase = async (req, res) => {
  try {
    const [connectionTest] = await db.execute('SELECT 1 as test');
    const [dbTables] = await db.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
    );
    let tableCount = null, tableError = null;
    try {
      const [countResult] = await db.execute(`SELECT COUNT(*) as count FROM ${TABLE_NAME}`);
      tableCount = countResult[0].count;
    } catch (err) { tableError = err.message; }

    // Test ES connection
    let esStatus = 'unknown';
    try {
      await esClient.info();
      esStatus = 'connected';
    } catch (_) { esStatus = 'unavailable'; }

    res.json({
      connected: true,
      database: process.env.DB_NAME || 'bmi',
      currentTable: TABLE_NAME,
      tableCount,
      tableError,
      availableTables: dbTables.map(t => t.TABLE_NAME),
      elasticsearch: esStatus
    });
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/summary
// ─────────────────────────────────────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const lightImsTable = tables.LIGHT_IMS;
    let totalInfluencers = 0;
    try {
      // Try ES first for total count
      const esRes = await esClient.count({
        index: ES_YT_INDEX,
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    { term: { closed: false } },
                    { bool: { must_not: [{ exists: { field: 'closed' } }] } }
                  ],
                  minimum_should_match: 1
                }
              },
              {
                bool: {
                  should: [
                    { term: { avoidsearch: false } },
                    { bool: { must_not: [{ exists: { field: 'avoidsearch' } }] } }
                  ],
                  minimum_should_match: 1
                }
              },
              { terms: { confirmed: [5, 6, 9, 10] } }
            ]
          }
        }
      });
      totalInfluencers = esRes.count || 0;
    } catch (_) {
      // ES fallback to MySQL
      try {
        const [r] = await db.execute(
          `SELECT COUNT(*) AS c FROM ${lightImsTable} WHERE closed=0 AND avoidsearch=0 AND confirmed IN (5,6,9,10)`
        );
        totalInfluencers = r[0].c || 0;
      } catch (err) { console.warn('Summary count failed:', err.message); }
    }

    let totalComments = 0, channelsWithComments = 0;
    try {
      const [cr] = await db.execute(`SELECT COUNT(*) as tc FROM ${tables.ADMINNOTES.TABLE}`);
      totalComments = cr[0].tc || 0;
      const [cwr] = await db.execute(
        `SELECT COUNT(DISTINCT channel) AS c FROM ${tables.ADMINNOTES.TABLE} WHERE channel IS NOT NULL AND channel != ''`
      );
      channelsWithComments = cwr[0].c || 0;
    } catch (err) { console.warn('Adminnotes summary failed:', err.message); }

    res.json({ totalInfluencers, totalComments, channelsWithComments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Language / country / add-language filters
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_LANGUAGES = [
  'Hindi','Bengali','Tamil','Telugu','Malayalam','Marathi','Gujarati',
  'Kannada','Punjabi','Odia','Bihari','Assamese','Santali','Urdu',
  'Haryanvi','Nepali','Bodo (India)','Sanskrit','Manipuri','Mizo',
  'Maithili','Kashmiri','Arabic','Vietnamese'
];

exports.getLanguages = async (req, res) => {
  // lang_with_shortcode table doesn't exist in this DB — return fixed list directly
  res.json(ALLOWED_LANGUAGES);
};

exports.getCountries = async (req, res) => {
  try {
    try {
      const [rows] = await db.execute(`SELECT country FROM ${tables.USER_COUNTRY} ORDER BY country ASC`);
      res.json(rows.map(r => r.country));
    } catch (_) {
      const [rows] = await db.execute(
        `SELECT DISTINCT country FROM ${TABLE_NAME} WHERE country IS NOT NULL AND country!='' ORDER BY country ASC`
      );
      res.json(rows.map(r => r.country));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
};

exports.getAddLanguages = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT language FROM ${tables.CHANNEL_DATA} WHERE language IS NOT NULL AND language!='' ORDER BY language`
    );
    res.json(rows.map(r => r.language));
  } catch (_) {
    res.json(ALLOWED_LANGUAGES);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/list  ←  PRIMARY: Elasticsearch | FALLBACK: MySQL
// ─────────────────────────────────────────────────────────────────────────────
exports.getList = async (req, res) => {
  try {
    let { search, status, sortBy, views, languages, emailFilter,
          barterFilter, excludeOldContent, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (languages && !Array.isArray(languages)) {
      languages = languages.split(',').map(l => l.trim()).filter(Boolean);
    }

    const params = { search, status, sortBy, views, languages, emailFilter,
                     barterFilter, excludeOldContent, dateFrom, dateTo, page, limit };

    // ── Try Elasticsearch ──────────────────────────────────────────────────
    let rows = [], totalCount = 0, source = 'elasticsearch';
    // Promotions sort requires MySQL JOIN — skip ES entirely for this sort
    const isPromoSort = sortBy === 'Promotions ASC' || sortBy === 'Promotions DESC';
    let esFailed = isPromoSort; // force MySQL when sorting by promotions
    if (isPromoSort) source = 'mysql';
    try {
      if (esFailed) throw new Error('skipped'); // skip ES for promo sort
      // Fetch 2x the requested limit so dedup still gives 20 unique rows
      const esQuery = buildESQuery({ ...params, limit: parseInt(limit) * 2 });
      const esRes   = await esClient.search(esQuery);

      totalCount = typeof esRes.hits.total === 'object'
        ? esRes.hits.total.value
        : esRes.hits.total;

      rows = (esRes.hits.hits || []).map(hit => ({
        ...hit._source,
        _id: hit._id
      }));

      // If search term given but ES returned 0 results → ES index is incomplete
      // Fall back to MySQL so unindexed records are still findable
      if (search && search.trim() && rows.length === 0) {
        console.warn(`⚠ ES returned 0 for search "${search}" — falling back to MySQL`);
        esFailed = true;
      } else {
        console.log(`✓ ES getList: ${rows.length} rows (total: ${totalCount})`);
      }
    } catch (esErr) {
      console.warn(`⚠ ES error (${esErr.message}), falling back to MySQL`);
      esFailed = true;
    }

    if (esFailed) {
      source = 'mysql';

      const statusStr   = status ? String(status).trim() : '';
      const statusLower = statusStr.toLowerCase();

      // isPromoSort already declared above

      // For promotions sort, use a subquery join to get promo_count
      let baseTable = `${TABLE_NAME}`;
      if (isPromoSort) {
        baseTable = `${TABLE_NAME} LEFT JOIN (
          SELECT be.channel AS promo_channel, COUNT(*) as promo_count
          FROM bmi.brandsextraction be
          INNER JOIN bmi.influencers_leaderboard lb ON be.channel = lb.channel
          GROUP BY be.channel
        ) promo_sub ON ${TABLE_NAME}.channel = promo_sub.promo_channel`;
      }

      let query = `SELECT ${TABLE_NAME}.* ${isPromoSort ? ', COALESCE(promo_sub.promo_count, 0) as promo_count_sort' : ''} FROM ${baseTable} WHERE 1=1`;
      const queryParams = [];

      const isNotInterest = Number(status) === 7 || statusLower.includes('not interest');
      const hasSearchTerm = !!(search && search.trim());
      if (!isNotInterest) {
        query += ` AND ${TABLE_NAME}.closed = 0`;
        if (!hasSearchTerm) query += ` AND ${TABLE_NAME}.avoidsearch = 0`;
      }

      if (search) {
        query += ` AND (${TABLE_NAME}.channel_name LIKE ? OR ${TABLE_NAME}.name LIKE ? OR ${TABLE_NAME}.yt_email LIKE ? OR ${TABLE_NAME}.conemail LIKE ?)`;
        const s = `%${search}%`;
        queryParams.push(s, s, s, s);
      }
      if (status !== undefined && status !== null && status !== '') {
        const st = Number(status);
        if      (st === 5 || statusLower === 'confirmed')              query += ` AND ${TABLE_NAME}.confirmed = 5`;
        else if (st === 1 || statusLower === 'unconfirmed')            query += ` AND ${TABLE_NAME}.confirmed = 1`;
        else if (st === 6 || statusLower === 'managed')                query += ` AND ${TABLE_NAME}.confirmed = 6`;
        else if (st === 8 || statusLower.includes('confirmed + managed') || statusLower === 'confirmed+managed')
                                                                       query += ` AND ${TABLE_NAME}.confirmed IN (5,6)`;
        else if (isNotInterest)                                        query += ` AND ${TABLE_NAME}.confirmed = 7`;
      }
      if (views) {
        const vn = parseInt(views, 10);
        if (!isNaN(vn) && vn > 0) {
          query += ` AND ${TABLE_NAME}.exposure >= ?`;
          queryParams.push(vn);
        }
      }
      if (languages?.length > 0) {
        const lc = languages.map(() => `(${TABLE_NAME}.language = ? OR ${TABLE_NAME}.language LIKE ?)`).join(' OR ');
        query += ` AND (${lc})`;
        languages.forEach(l => queryParams.push(l, l + '%'));
      }
      if (emailFilter === 'Has Email') {
        query += ` AND (${TABLE_NAME}.yt_email != '' OR ${TABLE_NAME}.conemail != '')`;
      } else if (emailFilter === 'No Email') {
        query += ` AND (${TABLE_NAME}.yt_email = '' AND ${TABLE_NAME}.conemail = '')`;
      }
      if (barterFilter === 'Yes') query += ` AND ${TABLE_NAME}.barter = 1`;
      else if (barterFilter === 'No') query += ` AND ${TABLE_NAME}.barter = 2`;
      if (excludeOldContent) {
        query += ` AND ${TABLE_NAME}.oldcontent = 0 AND ${TABLE_NAME}.videos > 0`;
      }
      if (dateFrom) { query += ` AND ${TABLE_NAME}.added_date >= ?`; queryParams.push(`${dateFrom} 00:00:00`); }
      if (dateTo)   { query += ` AND ${TABLE_NAME}.added_date <= ?`; queryParams.push(`${dateTo} 23:59:59`);   }

      const sortMap2 = {
        'Avg Views ASC': `${TABLE_NAME}.exposure ASC`,
        'Avg Views DESC': `${TABLE_NAME}.exposure DESC`,
        'Subscribers': `${TABLE_NAME}.subscribers DESC`,
        'New Channels': `${TABLE_NAME}.added_date DESC`,
        'Latest Confirmed': `${TABLE_NAME}.conf_date DESC`,
        'Last Updated': `${TABLE_NAME}.last_updated DESC`,
        'Engagement Rate ASC': `${TABLE_NAME}.engagementrate ASC`,
        'Engagement Rate DESC': `${TABLE_NAME}.engagementrate DESC`,
        'CPM Value ASC': `CAST(${TABLE_NAME}.price_view_ratio AS DECIMAL(12,4)) ASC`,
        'CPM Value DESC': `CAST(${TABLE_NAME}.price_view_ratio AS DECIMAL(12,4)) DESC`,
        'Highly Recommended ASC': `CAST(${TABLE_NAME}.inf_recommend AS UNSIGNED) ASC`,
        'Highly Recommended DESC': `CAST(${TABLE_NAME}.inf_recommend AS UNSIGNED) DESC`,
        'Work History DESC': `CAST(${TABLE_NAME}.inf_promotions AS UNSIGNED) DESC`,
        'Shorts Views ASC': `${TABLE_NAME}.shorts_avgviews ASC`,
        'Shorts Views DESC': `${TABLE_NAME}.shorts_avgviews DESC`,
        'Promotions ASC':  `CASE WHEN promo_sub.promo_count IS NULL THEN 1 ELSE 0 END ASC, COALESCE(promo_sub.promo_count, 0) ASC`,
        'Promotions DESC': `CASE WHEN promo_sub.promo_count IS NULL THEN 1 ELSE 0 END ASC, COALESCE(promo_sub.promo_count, 0) DESC`,
      };
      const orderBy = sortBy && sortMap2[sortBy] ? sortMap2[sortBy] : `${TABLE_NAME}.id DESC`;

      const cq = query.replace(
        `SELECT ${TABLE_NAME}.*${isPromoSort ? ' , COALESCE(promo_sub.promo_count, 0) as promo_count_sort' : ''}`,
        `SELECT COUNT(*) as count`
      );
      const [cr] = await db.execute(cq, queryParams);
      totalCount = cr[0].count;

      const limitNum = parseInt(limit) || 20;
      const offsetNum = (parseInt(page) - 1) * limitNum;
      query += ` ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const [mysqlRows] = await db.execute(query, queryParams);
      rows = mysqlRows;
    }

    // ── Deduplicate by channel ID (prevents duplicate rows when MySQL has dupes) ─
    const seen = new Set();
    rows = rows.filter(row => {
      const key = (row.channel && String(row.channel).trim()) || String(row.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, parseInt(limit) || 20); // trim back to requested page size

    // ── Enrich rows (admin notes + instagram + status text) ───────────────
    const enriched = await enrichRows(rows);

    res.json({
      rows: enriched,
      totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      source  // tells frontend whether ES or MySQL was used (useful for debugging)
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch list', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/comments/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT channel_id FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Influencer not found' });
    const channelId = rows[0].channel_id || id;
    const [comments] = await db.execute(
      `SELECT id, ${tables.ADMINNOTES.CHANNEL_ID_COLUMN} as channel_id, ${tables.ADMINNOTES.NOTE_COLUMN} as note, created_by, created_on 
       FROM ${tables.ADMINNOTES.TABLE} WHERE ${tables.ADMINNOTES.CHANNEL_ID_COLUMN} = ? ORDER BY id DESC`,
      [channelId]
    );
    res.json({
      channel_id: channelId,
      comments: (comments || []).map(r => ({
        id: r.id, channel_id: r.channel_id, note: r.note,
        created_by: r.created_by || '', created_on: r.created_on || null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const note = req.body.comment != null ? String(req.body.comment).trim() : '';
    if (!note) return res.status(400).json({ error: 'Note cannot be empty' });
    const [existing] = await db.execute(`SELECT channel_id FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (!existing.length) return res.status(404).json({ error: 'Influencer not found' });
    const channelId = existing[0].channel_id || id;
    const createdBy = (req.body.addedBy && String(req.body.addedBy).trim()) ? String(req.body.addedBy).trim() : 'Admin';
    await db.execute(
      `INSERT INTO ${tables.ADMINNOTES.TABLE} (${tables.ADMINNOTES.CHANNEL_ID_COLUMN}, ${tables.ADMINNOTES.NOTE_COLUMN}, created_by, created_on) VALUES (?, ?, ?, NOW())`,
      [channelId, note, createdBy]
    );
    res.json({ success: true, message: 'Comment added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
};

exports.updateAdminNote = async (req, res) => {
  try {
    const noteId = req.params.noteId;
    const note   = req.body.note != null ? String(req.body.note).trim() : '';
    if (!note) return res.status(400).json({ error: 'Note cannot be empty' });
    await db.execute(`UPDATE ${tables.ADMINNOTES.TABLE} SET ${tables.ADMINNOTES.NOTE_COLUMN} = ? WHERE id = ?`, [note, noteId]);
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const noteId = req.body.noteId != null ? req.body.noteId : req.params.noteId;
    if (!noteId) return res.status(400).json({ error: 'Note id required' });
    await db.execute(`DELETE FROM ${tables.ADMINNOTES.TABLE} WHERE id = ?`, [noteId]);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/similar/:id  (legacy)
// ─────────────────────────────────────────────────────────────────────────────
exports.getSimilar = async (req, res) => {
  try {
    const { id } = req.params;
    const [current] = await db.execute(`SELECT top_two_tags FROM ${TABLE_NAME} WHERE id = ?`, [id]);
    if (!current.length) return res.status(404).json({ error: 'Influencer not found' });
    const tags = current[0].top_two_tags;
    if (!tags) return res.json({ rows: [] });
    const [rows] = await db.execute(
      `SELECT id, channel_name, name, conemail, yt_email, cont_number, engagementrate, top_two_tags, yt_price
       FROM ${TABLE_NAME} WHERE top_two_tags = ? AND id != ? ORDER BY views DESC`,
      [tags, id]
    );
    res.json({ rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch similar influencers' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ims/influencer/similar  (quality-gated)
// ─────────────────────────────────────────────────────────────────────────────
exports.postSimilarInfluencers = async (req, res) => {
  try {
    const id  = req.body?.id != null ? Number(req.body.id) : NaN;
    let tags  = req.body?.tags;
    if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'id is required' });

    // tags may come as array of niche strings e.g. ['comedy', 'entertainment']
    // OR as already-parsed object from ES e.g. {comedy:{score:45}}
    let tagList = [];
    if (Array.isArray(tags)) {
      tagList = tags.filter(Boolean).map(String);
    } else if (tags && typeof tags === 'object') {
      // ES returned already-parsed object
      tagList = Object.keys(tags).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      const trimmed = tags.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          tagList = Object.keys(parsed).filter(Boolean);
        } else if (Array.isArray(parsed)) {
          tagList = parsed.filter(Boolean).map(String);
        }
      } catch (_) {
        tagList = trimmed.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    // Fallback: fetch top_two_tags from MySQL if still empty
    if (!tagList.length) {
      const [cur] = await db.execute(`SELECT top_two_tags FROM ${TABLE_NAME} WHERE id = ?`, [id]);
      if (cur.length && cur[0].top_two_tags) {
        const raw = cur[0].top_two_tags;
        try {
          const parsed = JSON.parse(raw);
          tagList = typeof parsed === 'object' && !Array.isArray(parsed)
            ? Object.keys(parsed).filter(Boolean)
            : Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
        } catch (_) {
          tagList = String(raw).split(',').map(t => t.trim()).filter(Boolean);
        }
      }
    }

    const qParams = [id];
    let where = ` WHERE id != ? AND closed = 0 AND avoidsearch = 0`;

    if (tagList.length) {
      where += ` AND (${tagList.map(() => 'top_two_tags LIKE ?').join(' OR ')})`;
      tagList.forEach(t => qParams.push(`%${t}%`));
    }

    // Relaxed quality gates — only filter obvious bad data
    where += ` AND (videos > 0)`;
    where += ` AND (exposure > 0)`;

    const [rows] = await db.execute(
      `SELECT channel_name, channel, exposure, engagementrate, top_two_tags, tag_category, yt_price, credit_cost
       FROM ${TABLE_NAME} ${where}
       ORDER BY exposure DESC
       LIMIT 10`,
      qParams
    );
    res.json({ rows: rows || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch similar influencers', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ims/channel-details
// ─────────────────────────────────────────────────────────────────────────────
const CHANNEL_ENGAGEMENT_TABLE = 'channel_engagement';

function parseJsonField(val) {
  if (val == null || val === '') return null;
  try { return JSON.parse(typeof val === 'string' ? val.trim() : String(val)); } catch (_) { return null; }
}
function normalizeScore(score) {
  if (score == null) return '';
  if (typeof score === 'object') return score.score ?? score.value ?? '';
  return String(score);
}
function toKeywordsArray(kj) {
  const p = parseJsonField(kj);
  if (!p) return [];
  if (Array.isArray(p)) return p.map(x => typeof x === 'object' ? { name: x.name||x.keyword||'', score: normalizeScore(x.score??x.value) } : { name: String(x), score: '' });
  if (typeof p === 'object') return Object.entries(p).map(([name, score]) => ({ name, score: normalizeScore(score) }));
  return [];
}
function toTagsArray(tj) {
  const p = parseJsonField(tj);
  if (!p) return [];
  if (Array.isArray(p)) return p.map(x => typeof x === 'object' ? { name: x.name||x.tag||'', score: normalizeScore(x.score??x.value) } : { name: String(x), score: '' });
  if (typeof p === 'object') return Object.entries(p).map(([name, score]) => ({ name, score: normalizeScore(score) }));
  return [];
}
function toCategoryArray(tc) {
  if (!tc) return [];
  const str = String(tc).trim();
  const p = parseJsonField(tc);
  if (Array.isArray(p)) return p.map(String);
  if (p && typeof p === 'object') return Object.values(p).map(String);
  return str.split(',').map(s => s.trim()).filter(Boolean);
}
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatVideoDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day   = String(d.getUTCDate()).padStart(2, '0');
    const month = MONTHS_SHORT[d.getUTCMonth()];
    const year  = d.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch (_) { return iso; }
}

function toVideosArray(vj, limit = 10) {
  let raw = vj;
  if (raw == null) return [];

  if (Buffer.isBuffer(raw)) {
    try { raw = raw.toString('utf8'); } catch (_) { return []; }
  }

  if (typeof raw === 'string') {
    let s = raw.trim();
    if (!s || s === '{}') return [];
    // Replace literal control characters (newlines, tabs, carriage returns)
    // inside JSON string values — these make JSON.parse throw SyntaxError
    s = s.replace(/[\r\n\t]/g, ' ');
    try { raw = JSON.parse(s); } catch (_) { return []; }
  }

  if (typeof raw !== 'object' || raw === null) return [];

  const list = [];
  for (const [videoId, val] of Object.entries(raw)) {
    if (!videoId || !val) continue;
    const title = (val.title ?? val.snippet?.title ?? '').toString().trim();
    // Skip blank/whitespace-only titles
    if (!title) continue;
    const publishedAt  = (val.publishedAt ?? val.snippet?.publishedAt ?? '').toString().trim();
    const publishedFmt = formatVideoDate(publishedAt);
    list.push({ videoId: String(videoId).trim(), title, publishedAt, publishedFmt });
  }

  list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  return list.slice(0, limit);
}

exports.getChannelDetails = async (req, res) => {
  try {
    const channel = req.body?.channel ? String(req.body.channel).trim() : '';
    if (!channel) return res.status(400).json({ error: 'channel is required' });
    const [rows] = await db.execute(
      `SELECT a.channel_name, a.keyword, a.tags, a.tag_category, a.yt_description, b.videos_details
       FROM ${tables.LIGHT_IMS} a LEFT JOIN ${CHANNEL_ENGAGEMENT_TABLE} b ON a.channel = b.channel
       WHERE a.channel = ?`,
      [channel]
    );
    if (!rows.length) return res.status(404).json({ error: 'Channel not found' });
    const row = rows[0];
    let videosDetails = row.videos_details;

    function isEmpty(v) {
      if (v == null) return true;
      if (Buffer.isBuffer(v)) {
        const s = v.toString('utf8').trim();
        return !s || s === '{}' || s === '[]';
      }
      if (typeof v === 'string') return v.trim() === '' || v.trim() === '{}';
      if (typeof v === 'object') return Object.keys(v).length === 0;
      return false;
    }
    if (isEmpty(videosDetails) && row.channel_name) {
      const cn = String(row.channel_name).trim();
      try {
        const [r] = await db.execute(`SELECT videos_details FROM ${CHANNEL_ENGAGEMENT_TABLE} WHERE channel = ? LIMIT 1`, [cn]);
        if (r.length && !isEmpty(r[0].videos_details)) videosDetails = r[0].videos_details;
      } catch (_) {}
      if (isEmpty(videosDetails)) {
        try {
          const [r] = await db.execute(`SELECT videos_details FROM ${CHANNEL_ENGAGEMENT_TABLE} WHERE channel_name = ? LIMIT 1`, [cn]);
          if (r.length && !isEmpty(r[0].videos_details)) videosDetails = r[0].videos_details;
        } catch (_) {}
      }
    }
    const videos = toVideosArray(videosDetails, 10);

    res.json({
      channel_name: row.channel_name || '',
      keywords: toKeywordsArray(row.keyword),
      tags: toTagsArray(row.tags),
      category: toCategoryArray(row.tag_category),
      yt_description: row.yt_description != null ? String(row.yt_description) : '',
      videos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channel details', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit / Delete influencer  (always MySQL — write operations)
// ─────────────────────────────────────────────────────────────────────────────
const ADD_UPDATE_TABLE = tables.LIGHT_IMS;

function confirmedToStatusText(confirmed) {
  const n = Number(confirmed);
  if (n === 1)  return 'Unconfirmed';
  if (n === 2)  return 'Auto Mail';
  if (n === 3)  return 'Manual Mail';
  if (n === 4)  return 'Responded';
  if (n === 5)  return 'Confirmed';
  if (n === 6)  return 'Managed';
  if (n === 7)  return 'Suspended';
  if (n === 9)  return 'BMI';
  if (n === 10) return 'Confirmed PPC';
  return confirmed != null && confirmed !== '' ? String(confirmed) : '';
}

const LIGHT_IMS_UPDATE_COLUMNS = new Set([
  'name','channel_name','channel','channel_url','approach','yt_email','email','cont_number',
  'currency','yt_price','est_price','barter','language','city','country',
  'status','confirmed','conemail','managedby',
  'freepromotion','note','admin_note','added_date','created_at','pricechangedon',
  'image_path','url','views','subscribers','engagementrate','last_updated','conf_date',
  'top_two_tags','exposure','shorts_views','oldcontent','videos','price_view_ratio','inf_recommend','inf_promotion'
]);

const ADD_INSERT_COLUMNS = new Set([
  'name','channel_name','channel','currency','yt_price','est_price','barter',
  'yt_email','cont_number','language','city','country','confirmed',
  'conemail','managedby','freepromotion','note','admin_note','approach','added_date','created_at'
]);

const STATUS_TO_NUM = {
  'Unconfirmed':1,'Auto Mail':2,'Manual Mail':3,'Responded':4,
  'Confirmed':5,'Managed':6,'Suspended':7,'BMI':9,'Confirmed PPC':10
};

function buildAddInfluencerPayload(body) {
  const channelUrl  = (body.channel_url || '').toString().trim();
  const channelId   = channelUrl ? (channelUrl.match(/\/channel\/([a-zA-Z0-9_-]+)/)||[])[1] || channelUrl : '';
  const statusVal   = body.status != null ? body.status : '';
  const confirmedNum = typeof statusVal === 'number' ? statusVal : (STATUS_TO_NUM[statusVal] ?? (isNaN(Number(statusVal)) ? null : Number(statusVal)));

  const managedByRaw = (body.managed_by != null ? body.managed_by : body.managedby != null ? body.managedby : '').toString().trim();

  const row = {
    name:         (body.name||'').toString().trim()||null,
    channel_name: (body.channel_name||'').toString().trim()||null,
    channel:      channelId||null,
    approach:     (body.gender||'').toString().trim()||null,
    yt_email:     (body.email||body.yt_email||'').toString().trim()||null,
    cont_number:  body.phone ? (body.phone||'').toString().trim()||null : null,
    currency:     (body.currency||'').toString().trim()||null,
    yt_price:     body.video_price != null && body.video_price !== '' ? Number(body.video_price) : null,
    est_price:    body.pitching_price != null && body.pitching_price !== '' ? Number(body.pitching_price) : null,
    barter:       body.barter === 'yes' || body.barter === 1 || body.barter === true ? 1 : 0,
    language:     (body.language||'').toString().trim()||null,
    city:         (body.city||'').toString().trim()||null,
    country:      (body.country||'').toString().trim()||null,
    confirmed:    confirmedNum,
    conemail:     (body.conversation_email != null ? body.conversation_email : body.conemail||'').toString().trim()||null,
    // managedby only included when non-empty — avoids NOT NULL violation
    managedby:    managedByRaw || null,
    freepromotion: body.free_promotion ? 1 : 0,
    note:         (body.note||'').toString().trim()||null,
    admin_note:   (body.admin_note||'').toString().trim()||null,
    added_date:   new Date().toISOString().slice(0,19).replace('T',' '),
    created_at:   new Date().toISOString().slice(0,19).replace('T',' ')
  };

  const filtered = {};
  for (const [k, v] of Object.entries(row)) {
    if (!ADD_INSERT_COLUMNS.has(k)) continue;
    // Always include numeric/boolean fields even when 0
    if (k === 'barter' || k === 'freepromotion') { filtered[k] = v; continue; }
    // Skip null/empty optional fields — prevents NOT NULL DB errors
    if (v === null || v === undefined || v === '') continue;
    filtered[k] = v;
  }
  return filtered;
}

function normalizeInfluencerPayload(body) {
  const fields = { ...body };
  if (fields.channel_url) {
    const url = String(fields.channel_url).trim();
    const m = url.match(/\/channel\/([a-zA-Z0-9_-]+)/);
    fields.channel = m ? m[1] : url;
    delete fields.channel_url;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'confirmed')) {
    fields.status = confirmedToStatusText(fields.confirmed);
    delete fields.confirmed;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'free_promotion')) {
    fields.freepromotion = fields.free_promotion ? 1 : 0;
    delete fields.free_promotion;
  }
  const filtered = {};
  for (const key of Object.keys(fields)) {
    if (LIGHT_IMS_UPDATE_COLUMNS.has(key)) filtered[key] = fields[key];
  }
  return filtered;
}

exports.getInfluencerById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(`SELECT * FROM ${ADD_UPDATE_TABLE} WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Influencer not found' });
    const row = rows[0];
    if (row.channel && !row.channel_url) row.channel_url = `https://www.youtube.com/channel/${row.channel}`;
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch influencer', details: error.message });
  }
};

exports.addInfluencer = async (req, res) => {
  try {
    const fields = buildAddInfluencerPayload(req.body || {});
    const cols   = Object.keys(fields).join(', ');
    const vals   = Object.values(fields);
    const phs    = vals.map(() => '?').join(', ');
    const [result] = await db.execute(`INSERT INTO ${ADD_UPDATE_TABLE} (${cols}) VALUES (${phs})`, vals);
    const insertId = result.insertId;

    // Fetch the full row and index in ES immediately so it's searchable right away
    try {
      const [newRows] = await db.execute(`SELECT * FROM ${ADD_UPDATE_TABLE} WHERE id = ?`, [insertId]);
      if (newRows.length > 0) {
        const doc = serializeForES({ ...newRows[0], id: insertId, elastic: 1 });
        await esClient.index({
          index:    ES_YT_INDEX,
          id:       String(insertId),
          document: doc,
          refresh:  true  // make searchable immediately
        });
        await db.execute(`UPDATE ${ADD_UPDATE_TABLE} SET elastic = 1 WHERE id = ?`, [insertId]);
        console.log(`✓ ES indexed new YT influencer id=${insertId}`);
      }
    } catch (esErr) {
      console.warn('ES index after add failed (non-fatal):', esErr.message);
    }

    res.json({ success: true, id: insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to add influencer' });
  }
};

exports.updateInfluencer = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = normalizeInfluencerPayload(req.body || {});
    const newPrice = req.body.yt_price != null && req.body.yt_price !== '' ? Number(req.body.yt_price) : null;
    if (newPrice !== undefined) {
      const [cur] = await db.execute(`SELECT yt_price FROM ${ADD_UPDATE_TABLE} WHERE id = ?`, [id]);
      if (cur.length && String(Number(cur[0].yt_price)) !== String(newPrice)) {
        fields.pricechangedon = new Date().toISOString().slice(0,19).replace('T',' ');
      }
    }
    const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    await db.execute(`UPDATE ${ADD_UPDATE_TABLE} SET ${setClause} WHERE id = ?`, [...Object.values(fields), id]);

    // Re-index in ES so edited data is searchable immediately
    try {
      const [updatedRows] = await db.execute(`SELECT * FROM ${ADD_UPDATE_TABLE} WHERE id = ?`, [id]);
      if (updatedRows.length > 0) {
        const doc = serializeForES({ ...updatedRows[0], id: Number(id), elastic: 1 });
        await esClient.index({
          index:    ES_YT_INDEX,
          id:       String(id),
          document: doc,
          refresh:  true
        });
        console.log(`✓ ES re-indexed YT influencer id=${id}`);
      }
    } catch (esErr) {
      console.warn('ES re-index after update failed (non-fatal):', esErr.message);
    }

    res.json({ success: true, message: 'Influencer updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update influencer' });
  }
};

exports.deleteInfluencer = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute(`DELETE FROM ${ADD_UPDATE_TABLE} WHERE id = ?`, [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Influencer not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// INSTAGRAM ENDPOINTS (always MySQL)
// ─────────────────────────────────────────────────────────────────────────────
exports.getInstaInfluencerById = async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT * FROM bmi.instagram_data WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Instagram influencer not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IG influencer', details: error.message });
  }
};

// POST /api/ims/insta/add — add new instagram influencer
exports.addInstaInfluencer = async (req, res) => {
  try {
    const body = req.body || {};

    // Parse username from instagram_url
    let username = '';
    if (body.instagram_url) {
      const m = String(body.instagram_url).trim().match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i);
      username = m ? m[1] : String(body.instagram_url).replace(/\/$/, '').split('/').pop();
    }
    if (!username) return res.status(400).json({ success: false, message: 'Valid Instagram URL is required' });

    // Check duplicate
    const [existing] = await db.execute(`SELECT id FROM bmi.instagram_data WHERE username = ? LIMIT 1`, [username]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'Instagram profile already exists' });

    const STATUS_IG = { 'Unconfirmed': 0, 'Confirmed': 1, 'Managed': 2, 'Followed': 3, 'Suspended': 4 };
    const statusNum = body.status != null ? (STATUS_IG[body.status] ?? Number(body.status)) : 0;
    const now       = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const igFields = {
      username,
      name:             (body.name || '').trim() || null,
      gender:           (body.gender || '').trim() || null,
      category:         (body.category || '').trim() || null,
      website:          (body.website || '').trim() || null,
      emails:           (body.email || '').trim() || null,
      phone:            (body.phone || '').trim() || null,
      currency:         (body.currency || '').trim() || null,
      inf_price:        body.reel_price  ? Number(body.reel_price)  : null,
      pitching_price:   body.post_price  ? Number(body.post_price)  : null,
      story_price:      body.story_price ? Number(body.story_price) : null,
      barter:           body.barter === 'yes' || body.barter === '1' || body.barter === 1 ? 1 : 0,
      language:         (body.language || '').trim() || null,
      country:          (body.country || '').trim() || null,
      bio:              (body.bio || '').trim() || null,
      status:           statusNum,
      // conversationemail is the actual column name in instagram_data
      conversationemail: (body.conversation_email || '').trim() || null,
      // managedby — only set if non-empty to avoid NOT NULL errors
      managedby:        (body.managed_by || body.managedby || '').toString().trim() || null,
      freepromotion:    body.free_promotion ? 1 : 0,
      added_date:       now,
      updated_date:     now,
      elastic:          0
    };

    // Remove null/undefined values — prevents NOT NULL constraint errors
    const cleanFields = Object.fromEntries(
      Object.entries(igFields).filter(([k, v]) => {
        if (v === null || v === undefined) return false;
        // Keep barter, freepromotion, status, elastic even when 0
        if (['barter','freepromotion','status','elastic'].includes(k)) return true;
        if (v === '') return false;
        return true;
      })
    );
    const cols = Object.keys(cleanFields).join(', ');
    const vals = Object.values(cleanFields);
    const phs  = vals.map(() => '?').join(', ');

    const [result] = await db.execute(
      `INSERT INTO bmi.instagram_data (${cols}) VALUES (${phs})`,
      vals
    );
    const insertId = result.insertId;

    // Save note to instagram_data_admin_notes
    // instagram_user_id stores the USERNAME string (confirmed from DB screenshots)
    const note = (body.note || '').trim();
    if (note) {
      try {
        await db.execute(
          `INSERT INTO bmi.instagram_data_admin_notes (instagram_user_id, note, createdby, createdon) VALUES (?, ?, 'Admin', NOW())`,
          [username, note]
        );
        console.log(`✓ IG note saved for username=${username}`);
      } catch (noteErr) {
        // Log full error so we can see exactly what's wrong
        console.error('IG note save failed - column error?', noteErr.message);
        console.error('SQL attempted:', `INSERT INTO bmi.instagram_data_admin_notes (instagram_user_id, note, createdby, createdon) VALUES ('${username}', '${note}', 'Admin', NOW())`);
      }
    }

    // Index in ES immediately
    try {
      const [newRows] = await db.execute(`SELECT * FROM bmi.instagram_data WHERE id = ?`, [insertId]);
      if (newRows.length > 0) {
        const doc = serializeForES({ ...newRows[0], id: insertId, elastic: 1 });
        await esClient.index({
          index:    'ims_instagram_data',
          id:       String(insertId),
          document: doc,
          refresh:  true
        });
        await db.execute(`UPDATE bmi.instagram_data SET elastic = 1 WHERE id = ?`, [insertId]);
        console.log(`✓ ES indexed new IG influencer id=${insertId}`);
      }
    } catch (esErr) {
      console.warn('ES index after IG add failed (non-fatal):', esErr.message);
    }

    res.json({ success: true, id: insertId, message: 'Instagram influencer added' });
  } catch (error) {
    console.error('Error adding IG influencer:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to add Instagram influencer' });
  }
};

exports.updateInstaInfluencer = async (req, res) => {
  try {
    const { id } = req.params;
    const body   = req.body || {};
    let username = null;
    if (body.instagram_url) {
      const m = String(body.instagram_url).trim().match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)/i);
      username = m ? m[1] : String(body.instagram_url).trim();
    }
    const allowed = {
      name: body.name != null ? String(body.name).trim() : undefined,
      username: username || undefined,
      gender: body.gender != null ? String(body.gender).trim() : undefined,
      category: body.category != null ? String(body.category).trim() : undefined,
      website: body.website != null ? String(body.website).trim() : undefined,
      emails: body.email != null ? String(body.email).trim() : undefined,
      phone: body.phone != null ? String(body.phone).trim() : undefined,
      currency: body.currency != null ? String(body.currency).trim() : undefined,
      inf_price: body.reel_price != null && body.reel_price !== '' ? Number(body.reel_price) : undefined,
      pitching_price: body.post_price != null && body.post_price !== '' ? Number(body.post_price) : undefined,
      story_price: body.story_price != null && body.story_price !== '' ? Number(body.story_price) : undefined,
      barter: body.barter != null ? (body.barter === '1' || body.barter === 1 ? true : false) : undefined,
      language:           body.language != null ? String(body.language).trim() : undefined,
      country:            body.country != null ? String(body.country).trim() : undefined,
      bio:                body.bio != null ? String(body.bio).trim() : undefined,
      status:             body.status != null && body.status !== '' ? Number(body.status) : undefined,
      conversationemail:  body.conversation_email != null ? String(body.conversation_email).trim() : undefined,
      managedby:          body.managed_by != null ? String(body.managed_by || '').trim()
                        : body.managedby != null ? String(body.managedby || '').trim() : undefined,
      freepromotion:      body.freepromotion != null ? (body.freepromotion ? 1 : 0) : undefined,
      note:               body.note != null ? String(body.note).trim() : undefined,
      updated_date:       new Date().toISOString().slice(0,19).replace('T',' '),
      elastic:            1,
    };
    const fields = Object.fromEntries(Object.entries(allowed).filter(([,v]) => v !== undefined));
    if (!Object.keys(fields).length) return res.status(400).json({ error: 'No valid fields to update' });
    const setClause = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    await db.execute(`UPDATE bmi.instagram_data SET ${setClause} WHERE id = ?`, [...Object.values(fields), id]);

    // Re-index in ES immediately
    try {
      const [updatedRows] = await db.execute(`SELECT * FROM bmi.instagram_data WHERE id = ?`, [id]);
      if (updatedRows.length > 0) {
        const doc = serializeForES({ ...updatedRows[0], id: Number(id), elastic: 1 });
        await esClient.index({
          index:    'ims_instagram_data',
          id:       String(id),
          document: doc,
          refresh:  true
        });
        console.log(`✓ ES re-indexed IG influencer id=${id}`);
      }
    } catch (esErr) {
      console.warn('ES re-index after IG update failed (non-fatal):', esErr.message);
    }

    res.json({ success: true, message: 'Instagram influencer updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update IG influencer' });
  }
};

exports.getInstaComments = async (req, res) => {
  try {
    // instagram_user_id in admin_notes = username string, not numeric id
    // resolve username from the numeric ig_id passed in URL
    const [igRow] = await db.execute(
      `SELECT username FROM bmi.instagram_data WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    const username = igRow.length > 0 ? igRow[0].username : req.params.id;

    const [rows] = await db.execute(
      `SELECT id, instagram_user_id, note, createdon, createdby
       FROM bmi.instagram_data_admin_notes
       WHERE instagram_user_id = ?
       ORDER BY id DESC`,
      [username]
    );
    res.json({
      ig_id: req.params.id,
      comments: (rows||[]).map(r => ({
        id:         r.id,
        ig_id:      r.instagram_user_id,
        note:       r.note,
        created_on: r.createdon  || null,
        created_by: r.createdby  || ''
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IG comments', details: error.message });
  }
};

exports.addInstaComment = async (req, res) => {
  try {
    const note    = req.body.comment != null ? String(req.body.comment).trim() : '';
    const addedBy = req.body.addedBy ? String(req.body.addedBy).trim() : 'Admin';
    if (!note) return res.status(400).json({ error: 'Comment cannot be empty' });

    // Resolve username from numeric id
    const [igRow] = await db.execute(
      `SELECT username FROM bmi.instagram_data WHERE id = ? LIMIT 1`,
      [req.params.id]
    );
    const username = igRow.length > 0 ? igRow[0].username : req.params.id;

    await db.execute(
      `INSERT INTO bmi.instagram_data_admin_notes (instagram_user_id, note, createdby, createdon) VALUES (?,?,?,NOW())`,
      [username, note, addedBy]
    );
    res.json({ success: true, message: 'Comment added' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add IG comment', details: error.message });
  }
};

exports.deleteInstaComment = async (req, res) => {
  try {
    const noteId = req.body.noteId;
    if (!noteId) return res.status(400).json({ error: 'noteId is required' });
    await db.execute(`DELETE FROM bmi.instagram_data_admin_notes WHERE id = ?`, [noteId]);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete IG comment', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/reindex — Bulk sync ALL MySQL light_ims records into ES
// Run once to fix incomplete ES index. Processes in batches of 500.
// ─────────────────────────────────────────────────────────────────────────────
exports.reindexAll = async (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const BATCH = 1000;
  // Allow resuming from a specific offset via ?from=1003000
  let offset  = parseInt(req.query.from || '0', 10) || 0;
  let indexed = 0;
  let failed  = 0;
  let total   = 0;

  try {
    const [[countRow]] = await db.execute(`SELECT COUNT(*) as c FROM ${tables.LIGHT_IMS}`);
    total = countRow.c;

    if (offset > 0) {
      res.write(`Resuming reindex from offset ${offset} (total: ${total} records)...\n`);
    } else {
      res.write(`Starting reindex of ${total} records in batches of ${BATCH}...\n`);
      // ── Test single document first (only on fresh start) ────────────────
      try {
        const [[testRow]] = await db.execute(`SELECT * FROM ${tables.LIGHT_IMS} LIMIT 1`);
        const testDoc = serializeForES({ ...testRow, elastic: 1 });
        await esClient.index({ index: ES_YT_INDEX, id: String(testRow.id), document: testDoc });
        res.write(`✓ Test document OK (id=${testRow.id})\n`);
      } catch (testErr) {
        res.write(`✗ Test document FAILED: ${testErr.message}\n`);
        res.write(`  Cannot proceed until this field mapping error is fixed.\n`);
        res.end();
        return;
      }
    }

    while (offset < total) {
      const [rows] = await db.execute(
        `SELECT * FROM ${tables.LIGHT_IMS} LIMIT ${BATCH} OFFSET ${offset}`
      );
      if (!rows.length) break;

      const operations = [];
      for (const row of rows) {
        operations.push({ index: { _index: ES_YT_INDEX, _id: String(row.id) } });
        operations.push(serializeForES({ ...row, elastic: 1 }));
      }

      try {
        const bulkRes = await esClient.bulk({ operations, refresh: false });

        if (bulkRes.errors) {
          const errItems = (bulkRes.items || []).filter(i => i.index?.error);
          const okCount  = rows.length - errItems.length;
          indexed += okCount;
          failed  += errItems.length;
          // Show first error detail to help diagnose
          if (errItems.length > 0) {
            const e = errItems[0].index.error;
            res.write(`Batch ${offset}-${offset+rows.length}: ${okCount} ok, ${errItems.length} failed — ${e.type}: ${e.reason}\n`);
          } else {
            res.write(`Batch ${offset}-${offset+rows.length}: ${okCount} indexed ✓\n`);
          }
        } else {
          indexed += rows.length;
          res.write(`Batch ${offset}-${offset+rows.length}: ${rows.length} indexed ✓\n`);
        }
      } catch (bulkErr) {
        failed += rows.length;
        res.write(`Batch ${offset}-${offset+rows.length}: ERROR — ${bulkErr.message}\n`);
      }

      offset += BATCH;
      // Brief pause every 20 batches to not overwhelm ES
      if ((offset / BATCH) % 20 === 0) await new Promise(r => setTimeout(r, 200));
    }

    try { await db.execute(`UPDATE ${tables.LIGHT_IMS} SET elastic = 1 WHERE elastic = 0`); } catch (_) {}

    res.write(`\n✓ DONE: ${indexed} indexed, ${failed} failed out of ${total} total\n`);
    res.end();
  } catch (error) {
    res.write(`\n✗ FAILED: ${error.message}\n${error.stack || ''}\n`);
    res.end();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/insta/list — Instagram-only paginated list
// Primary: ims_instagram_data ES index | Fallback: MySQL instagram_data
// ─────────────────────────────────────────────────────────────────────────────
const ES_IG_INDEX = 'ims_instagram_data';

function buildIGESQuery({ search, status, sortBy, barterFilter, priceFilter, followersFilter, page, limit }) {
  const from       = (parseInt(page) - 1) * parseInt(limit);
  const size       = parseInt(limit) || 20;
  const filters    = [];
  const mustClause = [];

  // Search: username, name, bio, tags by phrase prefix
  if (search && search.trim()) {
    mustClause.push({
      multi_match: {
        query:   search.trim(),
        fields:  ['username', 'name', 'bio'],
        type:    'phrase_prefix',
        lenient: true
      }
    });
  }

  // Status: 0=Unconfirmed,1=Confirmed,2=Managed,3=Followed,4=Suspended
  if (status !== undefined && status !== null && status !== '') {
    const statusStr = String(status).toLowerCase().trim();
    const statusMap = { 'unconfirmed': 0, 'confirmed': 1, 'managed': 2, 'followed': 3, 'suspended': 4 };
    if (statusStr === 'confirmed+managed' || statusStr === 'confirmed + managed') {
      filters.push({ terms: { status: [1, 2] } });
    } else if (statusMap[statusStr] !== undefined) {
      filters.push({ term: { status: statusMap[statusStr] } });
    } else if (!isNaN(Number(status))) {
      filters.push({ term: { status: Number(status) } });
    }
  }

  // Barter: 1=yes, 0=no, null=unknown
  if (barterFilter === 'Yes') {
    filters.push({ bool: { should: [{ term: { barter: true } }, { term: { barter: 1 } }], minimum_should_match: 1 } });
  } else if (barterFilter === 'No') {
    filters.push({ bool: { should: [{ term: { barter: false } }, { term: { barter: 0 } }], minimum_should_match: 1 } });
  } else if (barterFilter === 'Unknown') {
    filters.push({ bool: { must_not: [{ exists: { field: 'barter' } }] } });
  }

  // Price filter on inf_price (reel price) — less than value
  if (priceFilter) {
    const priceMax = parseInt(priceFilter, 10);
    if (!isNaN(priceMax)) {
      filters.push({ range: { inf_price: { lte: priceMax, gt: 0 } } });
    }
  }

  // Followers filter — greater than value
  if (followersFilter) {
    const followersMin = parseInt(followersFilter, 10);
    if (!isNaN(followersMin)) {
      filters.push({ range: { followers: { gte: followersMin } } });
    }
  }

  // Sort
  const sortMap = {
    'Followers DESC':           { followers:    { order: 'desc' } },
    'Followers/Following DESC': { followers:    { order: 'desc' } },
    'Confirmed':                { confirmed_on: { order: 'desc' } },
  };
  const sort = sortBy && sortMap[sortBy] ? [sortMap[sortBy]] : [{ followers: { order: 'desc' } }];

  return {
    index: ES_IG_INDEX,
    from,
    size,
    track_total_hits: true,
    query: {
      bool: {
        must:   mustClause.length > 0 ? mustClause : [{ match_all: {} }],
        filter: filters
      }
    },
    sort,
    _source: true
  };
}

exports.getInstaList = async (req, res) => {
  try {
    let { search, status, sortBy, barterFilter, priceFilter, followersFilter, page = 1, limit = 20 } = req.query;
    const params = { search, status, sortBy, barterFilter, priceFilter, followersFilter, page, limit };

    let rows = [], totalCount = 0, source = 'elasticsearch';

    // ── Try ES ─────────────────────────────────────────────────────────────
    try {
      const esQuery = buildIGESQuery(params);
      const esRes   = await esClient.search(esQuery);
      totalCount = typeof esRes.hits.total === 'object' ? esRes.hits.total.value : esRes.hits.total;
      rows = (esRes.hits.hits || []).map(hit => ({ ...hit._source, _id: hit._id }));
      console.log(`✓ ES instaList: ${rows.length} rows (total: ${totalCount})`);
    } catch (esErr) {
      console.warn(`⚠ ES insta failed (${esErr.message}), falling back to MySQL`);
      source = 'mysql';

      let query = `SELECT * FROM bmi.instagram_data WHERE 1=1`;
      const qp  = [];

      // Search by username or name
      if (search && search.trim()) {
        query += ` AND (username LIKE ? OR name LIKE ? OR bio LIKE ?)`;
        const s = `%${search.trim()}%`;
        qp.push(s, s, s);
      }

      if (status !== undefined && status !== null && status !== '') {
        const statusStr = String(status).toLowerCase().trim();
        const statusMap = { 'unconfirmed': 0, 'confirmed': 1, 'managed': 2, 'followed': 3, 'suspended': 4 };
        if (statusStr === 'confirmed+managed' || statusStr === 'confirmed + managed') {
          query += ` AND status IN (1,2)`;
        } else if (statusMap[statusStr] !== undefined) {
          query += ` AND status = ?`; qp.push(statusMap[statusStr]);
        }
      }
      if (barterFilter === 'Yes')     { query += ` AND barter = 1`; }
      else if (barterFilter === 'No') { query += ` AND barter = 0`; }
      else if (barterFilter === 'Unknown') { query += ` AND (barter IS NULL)`; }

      if (priceFilter) {
        const pm = parseInt(priceFilter, 10);
        if (!isNaN(pm)) { query += ` AND inf_price <= ? AND inf_price > 0`; qp.push(pm); }
      }
      if (followersFilter) {
        const fm = parseInt(followersFilter, 10);
        if (!isNaN(fm)) { query += ` AND followers >= ?`; qp.push(fm); }
      }

      const sortMap2 = {
        'Followers DESC': 'followers DESC',
        'Followers/Following DESC': 'followers DESC',
        'Confirmed': 'confirmed_on DESC',
      };
      const orderBy = sortBy && sortMap2[sortBy] ? sortMap2[sortBy] : 'followers DESC';

      const cq = query.replace('SELECT *', 'SELECT COUNT(*) as count');
      const [[countRow]] = await db.execute(cq, qp);
      totalCount = countRow.count;

      const limitNum  = parseInt(limit) || 20;
      const offsetNum = (parseInt(page) - 1) * limitNum;
      query += ` ORDER BY ${orderBy} LIMIT ${limitNum} OFFSET ${offsetNum}`;
      const [mysqlRows] = await db.execute(query, qp);
      rows = mysqlRows;
    }

    // Enrich: add notes count for each row
    if (rows.length > 0) {
      try {
        const usernames = [...new Set(rows.map(r => r.username).filter(Boolean))];
        if (usernames.length > 0) {
          const phs = usernames.map(() => '?').join(',');
          const [noteCounts] = await db.execute(
            `SELECT instagram_user_id, COUNT(*) as cnt FROM bmi.instagram_data_admin_notes
             WHERE instagram_user_id IN (${phs}) GROUP BY instagram_user_id`,
            usernames
          );
          const noteMap = new Map(noteCounts.map(r => [r.instagram_user_id, Number(r.cnt)]));
          rows = rows.map(r => ({ ...r, ig_notes_count: noteMap.get(r.username) || 0 }));
        }
      } catch (err) {
        console.warn('IG notes count failed:', err.message);
      }
    }

    // Map status numbers to text
    const IG_STATUS_TEXT = { 0: 'Unconfirmed', 1: 'Confirmed', 2: 'Managed', 3: 'Followed', 4: 'Suspended' };
    rows = rows.map(r => ({
      ...r,
      ig_id:      r.id,
      ig_status:  r.status,
      ig_name:    r.name,
      ig_tags:    r.tags,
      ig_added_date: r.added_date,
      ig_avg_views:  r.avg_views,
      ig_currency:   r.currency,
      ig_managedby:  r.managedby,
      ig_phone:      r.phone,
      status_text:   IG_STATUS_TEXT[r.status] || 'Unknown'
    }));

    res.json({ rows, totalCount, page: parseInt(page), limit: parseInt(limit), source });
  } catch (error) {
    console.error('getInstaList error:', error);
    res.status(500).json({ error: 'Failed to fetch Instagram list', details: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ims/channel-promotions/:channel
// Returns all brand promotions from brandsextraction for a channel
// Only for channels present in influencers_leaderboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getChannelPromotions = async (req, res) => {
  try {
    const channel = req.params.channel ? String(req.params.channel).trim() : '';
    if (!channel) return res.status(400).json({ error: 'channel is required' });

    // Verify channel exists in influencers_leaderboard
    const [lb] = await db.execute(
      `SELECT channel FROM bmi.influencers_leaderboard WHERE channel = ? LIMIT 1`,
      [channel]
    );
    if (!lb.length) return res.json({ rows: [], total: 0 });

    const [rows] = await db.execute(
      `SELECT videoid, title, published_on, brand_found, url
       FROM bmi.brandsextraction
       WHERE channel = ?
       ORDER BY id DESC`,
      [channel]
    );

    res.json({ rows, total: rows.length });
  } catch (error) {
    console.error('getChannelPromotions error:', error);
    res.status(500).json({ error: 'Failed to fetch promotions', details: error.message });
  }
};
