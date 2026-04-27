import { useState, useEffect } from 'react';
import api from '../config/api';

function SimilarSitesModal({ influencerId, onClose }) {
  const [similarInfluencers, setSimilarInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimilar();
  }, [influencerId]);

  const fetchSimilar = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/similar/${influencerId}`);
      setSimilarInfluencers(response.data.rows || []);
    } catch (error) {
      console.error('Error fetching similar influencers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format engagement rate to 2 decimal places
  const formatEngagementRate = (rate) => {
    if (!rate && rate !== 0) return '-';
    return parseFloat(rate).toFixed(2);
  };

  // Format price to 'K' format for thousands
  const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    const numPrice = parseFloat(price);
    if (numPrice >= 1000) {
      return `${(numPrice / 1000).toFixed(0)}K`;
    }
    return numPrice.toString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Similar Sites</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Views</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {similarInfluencers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No similar influencers found</td>
                  </tr>
                ) : (
                  similarInfluencers.map((influencer) => (
                    <tr key={influencer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div
                            className="font-medium"
                            title={`Publisher name - ${influencer.name || 'N/A'}`}
                          >
                            {influencer.channel_name || '-'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {influencer.conemail && (
                              <span title={`Conversation email - ${influencer.conemail}`}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#22c55e">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                              </span>
                            )}
                            {influencer.yt_email && (
                              <span title={`Youtube email - ${influencer.yt_email}`}>
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#ef4444">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                              </span>
                            )}
                            {influencer.cont_number && (
                              <span title={`Contact number - ${influencer.cont_number}`} className="cursor-help">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00acee">
                                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                                </svg>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">-</td>
                      <td className="px-4 py-3">{formatEngagementRate(influencer.engagementrate)}</td>
                      <td className="px-4 py-3">
                        {influencer.top_two_tags 
                          ? influencer.top_two_tags.split(',').map(tag => tag.trim().replace(/^\d+\.\s*/, '')).join(', ')
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span title={`YT Price: ${influencer.yt_price || 'N/A'}`}>
                          {formatPrice(influencer.yt_price)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimilarSitesModal;

