// PromotionsModal.jsx
import { useState, useEffect } from 'react';
import api from '../config/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAGE_SIZE = 20;

function fmtDate(str) {
  if (!str) return '-';
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) { return str; }
}

function PromotionsModal({ influencer, onClose }) {
  const [loading, setLoading] = useState(true);
  const [allRows, setAllRows] = useState([]);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState(1);

  const channel     = influencer?.channel || '';
  const channelName = influencer?.channel_name || channel;

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setPage(1);
    api.get(`/channel-promotions/${encodeURIComponent(channel)}`)
      .then(r => { setAllRows(r.data.rows || []); setError(null); })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [channel]);

  const totalCount = allRows.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const rows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Pagination buttons: << < [1..5] > >>
  function getPageNums() {
    const pages = [];
    let start = Math.max(1, page - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  const btnBase = {
    padding: '2px 8px', borderRadius: 4, border: '1px solid #D1D5DB',
    fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151'
  };
  const btnActive = { ...btnBase, background: '#185FA5', color: '#fff', border: '1px solid #185FA5', fontWeight: 700 };
  const btnDisabled = { ...btnBase, opacity: 0.4, cursor: 'default' };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full flex flex-col"
        style={{ maxWidth: 780, maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — channel name + total count */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Latest Promotions</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {channelName}
              {!loading && !error && (
                <span style={{ fontWeight: 700, color: '#185FA5', marginLeft: 6 }}>
                  • {totalCount} Promotion{totalCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading promotions...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No promotions found.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#', 'Video', 'Date', 'Brand'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 border-b border-gray-100">
                    {/* # */}
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    {/* Video — blue link */}
                    <td className="px-4 py-2">
                      <a
                        href={`https://youtube.com/watch?v=${row.videoid}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                        style={{ fontSize: 14 }}
                      >
                        {row.title || row.videoid}
                      </a>
                    </td>

                    {/* Date — bold, same size as video */}
                    <td className="px-4 py-2 whitespace-nowrap" style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                      {fmtDate(row.published_on)}
                    </td>

                    {/* Brand — same font size as video, black, not blue */}
                    <td className="px-4 py-2" style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#111827', textDecoration: 'none', fontWeight: 500 }}
                          onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={e => e.target.style.textDecoration = 'none'}
                        >
                          {row.brand_found || row.url}
                        </a>
                      ) : (
                        <span>{row.brand_found || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — pagination centered */}
        {!loading && !error && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex items-center justify-center gap-1">
            {/* << first */}
            <button style={page === 1 ? btnDisabled : btnBase}
              onClick={() => page > 1 && setPage(1)} disabled={page === 1}>«</button>
            {/* < prev */}
            <button style={page === 1 ? btnDisabled : btnBase}
              onClick={() => page > 1 && setPage(p => p - 1)} disabled={page === 1}>‹</button>

            {/* page numbers */}
            {getPageNums().map(n => (
              <button key={n} style={n === page ? btnActive : btnBase}
                onClick={() => setPage(n)}>{n}</button>
            ))}

            {/* > next */}
            <button style={page === totalPages ? btnDisabled : btnBase}
              onClick={() => page < totalPages && setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            {/* >> last */}
            <button style={page === totalPages ? btnDisabled : btnBase}
              onClick={() => page < totalPages && setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromotionsModal;
