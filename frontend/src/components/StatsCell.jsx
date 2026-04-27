import { formatCompactViews } from '../utils/format';

function StatsCell({ influencer }) {
  // Last 5 videos avg views from exposure column (light_ims)
  const avgViews = influencer.exposure != null && influencer.exposure !== '' ? Number(influencer.exposure) : 0;
  const shortsViews = influencer.shorts_views || 0;
  
  // Format engagement rate to 2 decimal places
  const formatEngagementRate = (rate) => {
    if (!rate && rate !== 0) return 'N/A';
    return parseFloat(rate).toFixed(2);
  };
  
  const videosEngagementRate = formatEngagementRate(influencer.engagementrate);
  const shortsEngagementRate = formatEngagementRate(influencer.shorts_engagementrate);

  return (
    <div className="space-y-1">
      {/* First Line: Last 5 Videos Average Views (exposure) and Engagement Rate */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className="cursor-help"
          title="Last 5 videos avg views"
        >
          {formatCompactViews(avgViews)}
        </span>
        <span className="text-gray-400">|</span>
        <span
          className="cursor-help"
          title="Last 5 videos engagement rate"
        >
          {videosEngagementRate}%
        </span>
      </div>
      
      {/* Second Line: Last 5 Shorts Average Views and Engagement Rate */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span
          className="cursor-help"
          title="Last 5 shorts avg views"
        >
          {formatCompactViews(shortsViews)}
        </span>
        <span className="text-gray-400">|</span>
        <span
          className="cursor-help"
          title="Last 5 shorts engagement rate"
        >
          {shortsEngagementRate}%
        </span>
      </div>
    </div>
  );
}

export default StatsCell;

