import { useEffect, useState } from 'react';
import api from '../config/api';

function FiltersPanel({ filters, onChange }) {
  const [languages, setLanguages]       = useState([]);
  const [showCalendars, setShowCalendars] = useState(false);
  const isIG = filters.platform === 'Instagram';

  useEffect(() => {
    api.get('/filters/languages').then(r => setLanguages(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) setShowCalendars(true);
  }, []);

  const handleChange = (key, value) => onChange({ [key]: value });

  const handleDateMode = (mode) => {
    if (mode === 'all') { setShowCalendars(false); onChange({ dateFrom: '', dateTo: '' }); }
    else setShowCalendars(true);
  };

  const dateMode = (filters.dateFrom || filters.dateTo || showCalendars) ? 'custom' : 'all';

  const lbl = 'block text-xs font-medium mb-1 text-gray-600 whitespace-nowrap';

  // Returns blue border+bg when filter has a non-default value
  const activeSel = (isActive) =>
    `w-full px-2 py-1.5 border rounded text-sm ${
      isActive
        ? 'border-blue-500 bg-blue-50 text-blue-800 font-medium'
        : 'border-gray-300 bg-white text-gray-700'
    }`;
  const activeInp = (isActive) =>
    `w-full px-2 py-1.5 border rounded text-sm ${
      isActive
        ? 'border-blue-500 bg-blue-50 text-blue-800'
        : 'border-gray-300 bg-white'
    }`;

  // Old aliases for non-conditional use
  const sel = activeSel(false);
  const inp = activeInp(false);

  // IG Status options (numeric string values)
  const IG_STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'Unconfirmed', label: 'Unconfirmed' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Managed', label: 'Managed' },
    { value: 'Followed', label: 'Followed' },
    { value: 'Suspended', label: 'Suspended' },
    { value: 'Confirmed + Managed', label: 'Confirmed + Managed' },
  ];

  return (
    <div className="bg-white px-4 py-3 rounded-lg shadow mb-6">
      <div className="flex items-end gap-2" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>

        {/* Platform — always visible */}
        <div style={{ minWidth: 90, flexShrink: 0 }}>
          <label className={lbl}>Platform</label>
          <select value={filters.platform || 'All'}
            onChange={e => handleChange('platform', e.target.value)}
            className={activeSel(filters.platform && filters.platform !== 'All')}>
            <option value="All">All</option>
            <option value="YouTube">YouTube</option>
            <option value="Instagram">Instagram</option>
          </select>
        </div>

        {/* Status — common for both, but different options */}
        <div style={{ minWidth: 130, flexShrink: 0 }}>
          <label className={lbl}>Status</label>
          <select value={filters.status}
            onChange={e => handleChange('status', e.target.value)}
            className={activeSel(!!filters.status)}>
            {isIG ? (
              IG_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
            ) : (
              <>
                <option value="">All</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Unconfirmed">Unconfirmed</option>
                <option value="Managed">Managed</option>
                <option value="Confirmed + Managed">Confirmed + Managed</option>
                <option value="Not Interested (WIP)">Not Interested</option>
              </>
            )}
          </select>
        </div>

        {/* Sort By — different options per platform */}
        <div style={{ minWidth: 130, flexShrink: 0 }}>
          <label className={lbl}>Sort By</label>
          {isIG ? (
            <select value={filters.sortBy}
              onChange={e => handleChange('sortBy', e.target.value)} className={activeSel(!!filters.sortBy)}>
              <option value="">All (Default)</option>
              <option value="Followers DESC">Followers DESC</option>
              <option value="Followers/Following DESC">Followers/Following DESC</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          ) : (
            <select value={filters.sortBy}
              onChange={e => handleChange('sortBy', e.target.value)} className={activeSel(!!filters.sortBy)}>
              <option value="">Default</option>
              <option value="Avg Views ASC">Views ASC</option>
              <option value="Avg Views DESC">Views DESC</option>
              <option value="Subscribers">Subscribers</option>
              <option value="New Channels">New Channels</option>
              <option value="Latest Confirmed">Latest Confirmed</option>
              <option value="Last Updated">Last Updated</option>
              <option value="Engagement Rate ASC">Eng Rate ASC</option>
              <option value="Engagement Rate DESC">Eng Rate DESC</option>
              <option value="CPM Value ASC">CPM ASC</option>
              <option value="CPM Value DESC">CPM DESC</option>
              <option value="Highly Recommended ASC">Recommended ASC</option>
              <option value="Highly Recommended DESC">Recommended DESC</option>
              <option value="Work History DESC">Work History</option>
              <option value="Shorts Views ASC">Shorts ASC</option>
              <option value="Shorts Views DESC">Shorts DESC</option>
              <option value="Promotions ASC">Promotions ASC</option>
              <option value="Promotions DESC">Promotions DESC</option>
            </select>
          )}
        </div>

        {/* ── YT-only filters ── */}
        {!isIG && (
          <>
            {/* Views */}
            <div style={{ minWidth: 90, flexShrink: 0 }}>
              <label className={lbl}>Views</label>
              <select value={filters.views || ''}
                onChange={e => handleChange('views', e.target.value)} className={activeSel(!!(filters.views))}>
                <option value="">All</option>
                <option value="101">&gt;100</option>
                <option value="1000">&gt;1K</option>
                <option value="2000">&gt;2K</option>
                <option value="5000">&gt;5K</option>
                <option value="10000">&gt;10K</option>
                <option value="20000">&gt;20K</option>
                <option value="50000">&gt;50K</option>
                <option value="100000">&gt;1L</option>
                <option value="200000">&gt;2L</option>
                <option value="500000">&gt;5L</option>
                <option value="1000000">&gt;1M</option>
              </select>
            </div>

            {/* Language */}
            <div style={{ minWidth: 100, flexShrink: 0 }}>
              <label className={lbl}>Language</label>
              <select
                value={filters.languages?.length === 1 ? filters.languages[0] : ''}
                onChange={e => handleChange('languages', e.target.value ? [e.target.value] : [])}
                className={activeSel(filters.languages?.length > 0)}>
                <option value="">All</option>
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>

            {/* Date */}
            <div style={{ flexShrink: 0 }}>
              <label className={lbl}>Date</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <select value={dateMode} onChange={e => handleDateMode(e.target.value)}
                  className={activeSel(showCalendars)} style={{ minWidth: 100 }}>
                  <option value="all">All Dates</option>
                  <option value="custom">Custom Date</option>
                </select>
                {showCalendars && (
                  <>
                    <input type="date" value={filters.dateFrom || ''}
                      onChange={e => handleChange('dateFrom', e.target.value)}
                      className={activeInp(!!filters.dateFrom)} style={{ minWidth: 130 }}/>
                    <span style={{ color: '#9CA3AF', fontSize: 12, flexShrink: 0 }}>→</span>
                    <input type="date" value={filters.dateTo || ''}
                      onChange={e => handleChange('dateTo', e.target.value)}
                      className={activeInp(!!filters.dateTo)} style={{ minWidth: 130 }}/>
                  </>
                )}
              </div>
            </div>

            {/* Email */}
            <div style={{ minWidth: 90, flexShrink: 0 }}>
              <label className={lbl}>Email</label>
              <select value={filters.emailFilter}
                onChange={e => handleChange('emailFilter', e.target.value)}
                className={activeSel(filters.emailFilter && filters.emailFilter !== 'All')}>
                <option value="All">All</option>
                <option value="Has Email">Has Email</option>
                <option value="No Email">No Email</option>
              </select>
            </div>

            {/* Exclude */}
            <div style={{ minWidth: 90, flexShrink: 0 }}>
              <label className={lbl}>Exclude</label>
              <select
                value={filters.excludeOldContent ? 'Yes' : 'No'}
                onChange={e => handleChange('excludeOldContent', e.target.value === 'Yes')}
                className={activeSel(!!filters.excludeOldContent)}>
                <option value="No">No</option>
                <option value="Yes">Old + no video</option>
              </select>
            </div>
          </>
        )}

        {/* ── IG-only filters ── */}
        {isIG && (
          <>
            {/* Price */}
            <div style={{ minWidth: 100, flexShrink: 0 }}>
              <label className={lbl}>Price</label>
              <select value={filters.priceFilter || ''}
                onChange={e => handleChange('priceFilter', e.target.value)}
                className={activeSel(!!filters.priceFilter)}>
                <option value="">All</option>
                <option value="5000">&lt;5K</option>
                <option value="10000">&lt;10K</option>
                <option value="20000">&lt;20K</option>
                <option value="30000">&lt;30K</option>
                <option value="40000">&lt;40K</option>
                <option value="50000">&lt;50K</option>
                <option value="60000">&lt;60K</option>
                <option value="70000">&lt;70K</option>
                <option value="80000">&lt;80K</option>
                <option value="90000">&lt;90K</option>
                <option value="100000">&lt;1L</option>
                <option value="500000">&lt;5L</option>
                <option value="5000000">&lt;50M</option>
              </select>
            </div>

            {/* Followers */}
            <div style={{ minWidth: 100, flexShrink: 0 }}>
              <label className={lbl}>Followers</label>
              <select value={filters.followersFilter || ''}
                onChange={e => handleChange('followersFilter', e.target.value)}
                className={activeSel(!!filters.followersFilter)}>
                <option value="">All</option>
                <option value="10000">&gt;10K</option>
                <option value="20000">&gt;20K</option>
                <option value="50000">&gt;50K</option>
                <option value="100000">&gt;1L</option>
                <option value="200000">&gt;2L</option>
                <option value="500000">&gt;5L</option>
                <option value="1000000">&gt;1M</option>
              </select>
            </div>
          </>
        )}

        {/* Barter — common for both */}
        <div style={{ minWidth: 80, flexShrink: 0 }}>
          <label className={lbl}>Barter</label>
          <select value={filters.barterFilter}
            onChange={e => handleChange('barterFilter', e.target.value)}
            className={activeSel(filters.barterFilter && filters.barterFilter !== 'All')}>
            <option value="All">All</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            {isIG && <option value="Unknown">Unknown</option>}
          </select>
        </div>

      </div>
    </div>
  );
}

export default FiltersPanel;
