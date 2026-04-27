// PromotionsModal.jsx
// Shows all brand promotions from bmi.brandsextraction for a channel

import { useState, useEffect } from 'react';
import api from '../config/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

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
  const [rows, setRows]       = useState([]);
  const [error, setError]     = useState(null);

  const channel     = influencer?.channel || '';
  const channelName = influencer?.channel_name || channel;

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    api.get(`/channel-promotions/${encodeURIComponent(channel)}`)
      .then(r => { setRows(r.data.rows || []); setError(null); })
      .catch(e => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [channel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-h-[85vh] flex flex-col"
        style={{ maxWidth: 750 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Latest Promotions</h2>
            <p className="text-xs text-gray-500 mt-0.5">{channelName}</p>
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
                    <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2">
                      <a
                        href={`https://youtube.com/watch?v=${row.videoid}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {row.title || row.videoid}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-gray-600 whitespace-nowrap text-xs">
                      {fmtDate(row.published_on)}
                    </td>
                    <td className="px-4 py-2">
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs">
                          {row.brand_found || row.url}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs">{row.brand_found || '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && rows.length > 0 && (
          <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400 shrink-0">
            {rows.length} promotion{rows.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
}

export default PromotionsModal;
