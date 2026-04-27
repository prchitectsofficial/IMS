import React, { useState } from 'react';
import ChannelCell from './ChannelCell';
import PromotionsModal from './PromotionsModal';
import StatsCell from './StatsCell';
import PriceCell from './PriceCell';
import StatusCell from './StatusCell';
import AdminNoteCell from './AdminNoteCell';
import InstaChannelCell from './InstaChannelCell';
import InstaTagsCell from './InstaTagsCell';
import InstaStatsCell from './InstaStatsCell';
import InstaPriceCell from './InstaPriceCell';
import InstaStatusCell from './InstaStatusCell';
import InstaFormModal from './InstaFormModal';
import InstaCommentsModal from './InstaCommentsModal';
import { formatCompactViews } from '../utils/format';

// ─── tag helpers ─────────────────────────────────────────────────────────────
function getAllNichesFromTopTwoTags(topTwoTags) {
  if (topTwoTags == null || topTwoTags === '') return [];
  // ES returns already-parsed object — handle directly without JSON.parse
  if (typeof topTwoTags === 'object' && !Array.isArray(topTwoTags)) {
    return Object.keys(topTwoTags).filter(Boolean);
  }
  const str = String(topTwoTags).trim();
  if (!str || str === '[]' || str === '{}') return [];
  try {
    const p = JSON.parse(str);
    if (p && typeof p === 'object' && !Array.isArray(p)) return Object.keys(p).filter(Boolean);
    if (Array.isArray(p)) return p.filter(Boolean).map(String);
  } catch (_) {}
  return str.split(',').map(s => s.replace(/\s*[(\-].*$/, '').trim()).filter(Boolean);
}
function parsePercentileEntries(s) {
  if (!s || !String(s).trim()) return [];
  return String(s).split(',').map(e => e.trim()).filter(Boolean);
}
function formatTagsTwoNiches(influencer) {
  // Step 1: Get niche names from top_two_tags
  const topTwo = getAllNichesFromTopTwoTags(influencer.top_two_tags);

  // All percentile columns parsed into entry lists (priority order)
  const allEntriesPerCol = [
    influencer.cat_percentile_1,
    influencer.cat_percentile_5,
    influencer.cat_percentile_10,
  ].map(col =>
    (col && String(col).trim())
      ? String(col).split(',').map(e => e.trim()).filter(Boolean)
      : []
  );

  // For a given niche name, find its best percentile entry across all columns
  function findEntryForNiche(niche) {
    const nicheLC = String(niche).trim().toLowerCase();
    for (const entries of allEntriesPerCol) {
      const match = entries.find(e => e.split(' - ')[0].trim().toLowerCase() === nicheLC);
      if (match) return match; // e.g. "Comedy - Top 1%"
    }
    // No percentile match → return capitalized niche name
    return niche.charAt(0).toUpperCase() + niche.slice(1);
  }

  // Find any percentile entry that is DIFFERENT from niche1
  function findDifferentEntry(niche1LC) {
    for (const entries of allEntriesPerCol) {
      const diff = entries.find(e => e.split(' - ')[0].trim().toLowerCase() !== niche1LC);
      if (diff) return diff;
    }
    return null;
  }

  if (!topTwo.length) return null;

  const niche1Entry = findEntryForNiche(topTwo[0]);

  let niche2Entry = null;
  if (topTwo[1]) {
    // top_two_tags has 2 niches — find percentile for second niche
    niche2Entry = findEntryForNiche(topTwo[1]);
  } else {
    // top_two_tags has only 1 niche — pick a DIFFERENT entry from percentile columns
    const niche1LC = String(topTwo[0]).trim().toLowerCase();
    niche2Entry = findDifferentEntry(niche1LC);
    // If nothing found, leave niche2 as null (show only 1 line)
  }

  return [niche1Entry, niche2Entry];
}
function formatTopTwoTagsNicheOnly(topTwoTags) {
  if (!topTwoTags) return null;
  if (typeof topTwoTags === 'object' && !Array.isArray(topTwoTags)) {
    return Object.keys(topTwoTags).filter(Boolean);
  }
  const str = String(topTwoTags).trim();
  if (!str || str === '[]' || str === '{}') return null;
  try {
    const p = JSON.parse(str);
    if (p && typeof p === 'object' && !Array.isArray(p)) return Object.keys(p).filter(Boolean);
    if (Array.isArray(p)) return p.filter(Boolean).map(String);
  } catch (_) {}
  return null;
}

// ─── platform logos ───────────────────────────────────────────────────────────
const YT_LOGO = (
  <svg width="22" height="15" viewBox="0 0 22 15" style={{ flexShrink: 0 }}>
    <rect width="22" height="15" rx="3" fill="#FF0000"/>
    <path d="M8.5 11V5L15 8Z" fill="white"/>
  </svg>
);
const IG_LOGO = (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <defs>
      <radialGradient id="igLogoGrad" cx="30%" cy="107%" r="150%">
        <stop offset="0%"  stopColor="#fdf497"/>
        <stop offset="5%"  stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#igLogoGrad)"/>
    <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8"/>
    <circle cx="17.5" cy="6.5" r="1.3" fill="white"/>
  </svg>
);

// ─── shared cell padding ──────────────────────────────────────────────────────
const TD_YT = {
  padding: '10px 12px',
  verticalAlign: 'middle',
  borderBottom: '1px dashed #E5E7EB',
  fontSize: 14
};
const TD_IG = {
  padding: '10px 12px',
  verticalAlign: 'middle',
  borderBottom: '1.5px solid #F3F4F6',
  background: 'rgba(253,242,248,0.35)',
  fontSize: 14
};
// When platform=Instagram — IG row uses solid bottom border (no dashed YT above it)
const TD_IG_ONLY = {
  ...TD_IG,
  borderBottom: '1.5px solid #F3F4F6',
};

// ─── main component ───────────────────────────────────────────────────────────
function InfluencerTable({
  influencers, loading, platform = 'All',
  onEdit, onCommentsClick, onSimilarClick, onChannelDetailClick,
  expandedSimilarId, similarDataById, loadingSimilarId,
  page, totalCount, onPageChange
}) {
  const totalPages = Math.ceil(totalCount / 20);
  const [igEditId,    setIgEditId]    = useState(null);
  const [igCommentId, setIgCommentId] = useState(null);
  const [promotionsInfluencer, setPromotionsInfluencer] = useState(null);

  // ── platform filtering ────────────────────────────────────────────────────
  // 'All'       → show both YT row + IG row (current behaviour)
  // 'YouTube'   → show only YT rows (hide IG rows)
  // 'Instagram' → dedicated IG-only table (rows ARE instagram records directly)
  const showYT = platform !== 'Instagram';
  const showIG = platform !== 'YouTube';

  // For Instagram-only mode, rows come directly from /insta/list
  // They are instagram_data rows, not light_ims rows
  const isIGOnly = platform === 'Instagram';

  // For mixed/YT mode, filter as before
  const visibleInfluencers = isIGOnly
    ? influencers  // already IG rows from /insta/list
    : platform === 'Instagram'
      ? influencers.filter(inf => !!inf.instagram)
      : influencers;

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!visibleInfluencers.length) return (
    <div className="bg-white rounded-lg shadow p-8 text-center">
      <p className="text-gray-500">
        {isIGOnly ? 'No Instagram influencers found.' : 'No influencers found.'}
      </p>
    </div>
  );

  // ── INSTAGRAM-ONLY TABLE ──────────────────────────────────────────────────
  if (isIGOnly) {
    return (
      <>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '23%' }}/>
                <col style={{ width: '14%' }}/>
                <col style={{ width: '13%' }}/>
                <col style={{ width: '17%' }}/>
                <col style={{ width: '13%' }}/>
                <col style={{ width: '10%' }}/>
                <col style={{ width: '10%' }}/>
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  {['Channel','Tags','Stats','Prices','Status','Admin Note','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleInfluencers.map(ig => {
                  const tdStyle = {
                    padding: '10px 12px',
                    verticalAlign: 'middle',
                    borderBottom: '1px solid #F3F4F6',
                    fontSize: 14
                  };
                  return (
                    <tr key={ig.ig_id || ig.id} className="hover:bg-pink-50">
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <div style={{ paddingTop: 4, flexShrink: 0 }}>{IG_LOGO}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <InstaChannelCell insta={ig}/>
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle}><InstaTagsCell insta={ig}/></td>
                      <td style={tdStyle}><InstaStatsCell insta={ig}/></td>
                      <td style={tdStyle}><InstaPriceCell insta={ig}/></td>
                      <td style={tdStyle}><InstaStatusCell insta={ig}/></td>
                      <td style={tdStyle}>
                        <button onClick={() => setIgCommentId(ig.ig_id || ig.id)}
                          className={`p-1.5 rounded flex items-center gap-1 text-sm font-medium ${
                            Number(ig.ig_notes_count) > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-white border border-gray-300 text-gray-700'
                          }`}>
                          <span>💬</span>
                          {Number(ig.ig_notes_count) > 0 && <span>{ig.ig_notes_count}</span>}
                        </button>
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => setIgEditId(ig.ig_id || ig.id)}
                          className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 rounded"
                          title="Edit IG details">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {Math.ceil(totalCount / 20) > 1 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} results
              </div>
              <div className="flex gap-2">
                <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                <button onClick={() => onPageChange(page + 1)} disabled={page >= Math.ceil(totalCount / 20)}
                  className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </div>

        {igEditId && <InstaFormModal igId={igEditId} onClose={() => setIgEditId(null)} onSave={() => setIgEditId(null)}/>}
        {igCommentId && <InstaCommentsModal igId={igCommentId} onClose={() => setIgCommentId(null)} onUpdate={() => {}}/>}
      </>
    );
  }

  return (
    <>
      {/* Total Results — left aligned above table, same style as footer */}
      <div className="text-sm text-gray-700" style={{ marginBottom: 6 }}>
        Total Results — <span style={{ fontWeight: 600 }}>{totalCount.toLocaleString()}</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '20%' }}/>
              <col style={{ width: '7%' }}/>
              <col style={{ width: '13%' }}/>
              <col style={{ width: '13%' }}/>
              <col style={{ width: '14%' }}/>
              <col style={{ width: '12%' }}/>
              <col style={{ width: '10%' }}/>
              <col style={{ width: '11%' }}/>
            </colgroup>
            <thead className="bg-gray-50">
              <tr>
                {['Channel','Promotions','Tags','YT Stats','Prices','Status','Admin Note','Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white">
              {visibleInfluencers.map(influencer => {
                const ig = influencer.instagram || null;

                const twoNiches = formatTagsTwoNiches(influencer);
                const eyeBtn = (
                  <button type="button"
                    onClick={() => onChannelDetailClick && onChannelDetailClick(influencer)}
                    className="mt-1 self-start p-0.5 rounded border border-blue-600 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    title="Channel details">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                );

                // border style: when platform=Instagram, IG row has solid bottom (no dashed row above)
                const igTdStyle = (platform === 'Instagram') ? TD_IG_ONLY : TD_IG;

                return (
                  <React.Fragment key={influencer.id}>

                    {/* ════ YT ROW ════ */}
                    {showYT && (
                      <tr className="hover:bg-gray-50">

                        {/* CHANNEL YT */}
                        <td style={TD_YT}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <div style={{ paddingTop: 4, flexShrink: 0 }}>{YT_LOGO}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <ChannelCell
                                influencer={influencer}
                                onPromotionsClick={setPromotionsInfluencer}
                              />
                            </div>
                          </div>
                        </td>

                        {/* PROMOTIONS YT */}
                        <td style={TD_YT}>
                          {influencer.promo_count != null ? (
                            <button
                              onClick={() => setPromotionsInfluencer(influencer)}
                              title="View promotions"
                              style={{
                                fontWeight: 600, fontSize: 15, color: '#185FA5',
                                background: '#EFF6FF', border: '1px solid #BFDBFE',
                                borderRadius: 6, padding: '2px 10px', cursor: 'pointer'
                              }}
                            >
                              {influencer.promo_count}
                            </button>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>
                          )}
                        </td>

                        {/* TAGS YT */}
                        <td style={TD_YT}>
                          <div className="flex flex-col gap-1">
                            {(() => {
                              if (!twoNiches || (twoNiches[0] == null && twoNiches[1] == null))
                                return <><span className="text-gray-400" style={{ fontSize: 14 }}>-</span>{eyeBtn}</>;
                              const [p, s] = twoNiches;
                              return (
                                <>
                                  {p != null && <span className="block" style={{ fontSize: 14 }}>{p}</span>}
                                  {s != null && <span className="block" style={{ fontSize: 14 }}>{s}</span>}
                                  {eyeBtn}
                                </>
                              );
                            })()}
                          </div>
                        </td>

                        {/* YT STATS */}
                        <td style={TD_YT}><StatsCell influencer={influencer}/></td>

                        {/* PRICES YT */}
                        <td style={TD_YT}><PriceCell influencer={influencer}/></td>

                        {/* STATUS YT */}
                        <td style={TD_YT}><StatusCell influencer={influencer}/></td>

                        {/* ADMIN NOTE YT */}
                        <td style={TD_YT}>
                          <AdminNoteCell influencer={influencer}
                            onCommentsClick={() => onCommentsClick(influencer.id)}/>
                        </td>

                        {/* ACTION YT */}
                        <td style={TD_YT}>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => onSimilarClick(influencer)}
                              className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 rounded"
                              title="Similar channels">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="12" r="7"/><circle cx="15" cy="12" r="7"/>
                              </svg>
                            </button>
                            <button onClick={() => onEdit(influencer)}
                              className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 rounded"
                              title="Edit YT details">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* ════ IG ROW (only when ig data exists AND platform allows) ════ */}
                    {ig && showIG && (
                      <tr>

                        {/* CHANNEL IG */}
                        <td style={igTdStyle}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                            <div style={{ paddingTop: 4, flexShrink: 0 }}>{IG_LOGO}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <InstaChannelCell insta={ig}/>
                            </div>
                          </div>
                        </td>

                        {/* PROMOTIONS IG — not applicable */}
                        <td style={igTdStyle}>
                          <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>
                        </td>

                        {/* TAGS IG */}
                        <td style={igTdStyle}><InstaTagsCell insta={ig}/></td>

                        {/* STATS IG */}
                        <td style={igTdStyle}><InstaStatsCell insta={ig}/></td>

                        {/* PRICES IG */}
                        <td style={igTdStyle}><InstaPriceCell insta={ig}/></td>

                        {/* STATUS IG */}
                        <td style={igTdStyle}><InstaStatusCell insta={ig}/></td>

                        {/* ADMIN NOTE IG */}
                        <td style={igTdStyle}>
                          {(() => {
                            const count = Number(ig.ig_notes_count) || 0;
                            return (
                              <button
                                onClick={() => setIgCommentId(ig.ig_id)}
                                className={`p-1.5 rounded flex items-center justify-center gap-1 text-sm font-medium ${
                                  count > 0
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-white border border-gray-300 text-gray-700'
                                }`}
                                title="IG Admin Notes">
                                <span aria-hidden>💬</span>
                                {count > 0 && <span className="min-w-[1.25rem]">{count}</span>}
                              </button>
                            );
                          })()}
                        </td>

                        {/* ACTION IG */}
                        <td style={igTdStyle}>
                          <button
                            onClick={() => setIgEditId(ig.ig_id)}
                            className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-blue-800 rounded"
                            title="Edit IG details">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )}

                    {/* ════ SIMILAR expanded ════ */}
                    {showYT && expandedSimilarId === influencer.id && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-gray-50">
                          <div className="p-4 border-t border-gray-200">
                            {loadingSimilarId === influencer.id ? (
                              <div className="text-center py-4 text-gray-500">Loading similar channels…</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      {['Channel Name','Avg. View','Eng. Rate','Tags','YT Price'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {(!similarDataById[influencer.id] || !similarDataById[influencer.id].length) ? (
                                      <tr><td colSpan={5} className="px-3 py-3 text-center text-gray-500">No similar channels found</td></tr>
                                    ) : (
                                      similarDataById[influencer.id].slice(0, 10).map((row, idx) => {
                                        const tags = formatTopTwoTagsNicheOnly(row.top_two_tags);
                                        return (
                                          <tr key={row.channel || idx} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">{row.channel_name ?? '-'}</td>
                                            <td className="px-3 py-2">{row.exposure != null ? formatCompactViews(row.exposure) : '-'}</td>
                                            <td className="px-3 py-2">{row.engagementrate != null ? Number(row.engagementrate).toFixed(2) : '-'}</td>
                                            <td className="px-3 py-2">{tags?.join(', ') || '-'}</td>
                                            <td className="px-3 py-2">{row.yt_price != null ? formatCompactViews(row.yt_price) : '-'}</td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} results
            </div>
            <div className="flex gap-2">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
              <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* IG Edit Modal */}
      {igEditId && (
        <InstaFormModal
          igId={igEditId}
          onClose={() => setIgEditId(null)}
          onSave={() => setIgEditId(null)}
        />
      )}

      {/* IG Comments Modal */}
      {igCommentId && (
        <InstaCommentsModal
          igId={igCommentId}
          onClose={() => setIgCommentId(null)}
          onUpdate={() => {}}
        />
      )}

      {/* Promotions Modal */}
      {promotionsInfluencer && (
        <PromotionsModal
          influencer={promotionsInfluencer}
          onClose={() => setPromotionsInfluencer(null)}
        />
      )}
    </>
  );
}

export default InfluencerTable;
