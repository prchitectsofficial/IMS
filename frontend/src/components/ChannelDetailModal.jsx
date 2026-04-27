import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { formatScoreTwoDecimals } from '../utils/format';

/** Show only niche with number (like main table Tags). Score formatted to 2 decimals. */
function formatWithScore(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return '-';
  return items.map((x) => {
    const name = x.name ?? '';
    const score = x.score;
    const scoreDisplay = (typeof score === 'object' && score !== null)
      ? (score.score ?? score.value ?? '')
      : score;
    const formatted = formatScoreTwoDecimals(scoreDisplay);
    const hasScore = formatted !== '';
    return hasScore ? `${name}(${formatted})` : name;
  }).join(', ');
}

/** Convert ISO date string to DD-MMM-YYYY (e.g. 02-Dec-2023). Invalid → "-" */
function formatVideoDate(isoDate) {
  if (isoDate == null || String(isoDate).trim() === '') return '-';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function ChannelDetailModal({ influencer, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const channel = influencer?.channel ?? '';

  useEffect(() => {
    if (!channel) {
      setError('Channel not provided');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    api
      .post('/channel-details', { channel })
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.message || 'Failed to load channel details');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [channel]);

  if (!influencer) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">Channel Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-blue-600 mb-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-gray-600">Loading channel details...</span>
            </div>
          )}

          {error && !loading && (
            <div className="py-8 text-center text-red-600">{error}</div>
          )}

          {data && !loading && (
            <table className="min-w-full border border-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200 w-32">Channel Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200">Keywords</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200">Tags</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200 w-28">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200">YT Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase border border-gray-200">Video Details</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <tr>
                  <td className="px-3 py-2 border border-gray-200 align-top">{data.channel_name || '-'}</td>
                  <td className="px-3 py-2 border border-gray-200 align-top">{formatWithScore(data.keywords)}</td>
                  <td className="px-3 py-2 border border-gray-200 align-top">{formatWithScore(data.tags)}</td>
                  <td className="px-3 py-2 border border-gray-200 align-top">
                    {data.category?.length ? data.category.join(', ') : '-'}
                  </td>
                  <td className="px-3 py-2 border border-gray-200 align-top whitespace-pre-wrap max-w-xs">{data.yt_description || '-'}</td>
                  <td className="px-3 py-2 border border-gray-200 align-top w-80">
                    <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                      {data.videos?.length ? (
                        data.videos.map((v, i) => (
                          <div key={v.videoId || i} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                            <div className="text-xs">
                              <span className="text-gray-500">ID: </span>
                              <a
                                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-mono"
                              >
                                {v.videoId}
                              </a>
                            </div>
                            <div className="font-medium text-gray-800 text-xs mt-0.5">
                              Title: {v.title} - {formatVideoDate(v.publishedAt)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500">No videos found</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChannelDetailModal;
