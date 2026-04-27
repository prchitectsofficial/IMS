// InstaStatsCell.jsx — inf_score moved to avatar badge in InstaChannelCell
// Line 1: Followers | Followers÷Following ratio
// Line 2: Avg views (if available)

import { formatCompactViews } from '../utils/format';

function InstaStatsCell({ insta }) {
  const followers = insta.followers != null && insta.followers !== '' ? Number(insta.followers) : null;
  const following = insta.following != null && insta.following !== '' ? Number(insta.following) : null;
  const avgViews  = insta.ig_avg_views != null && insta.ig_avg_views !== '' ? Number(insta.ig_avg_views) : null;

  const ratio = (followers != null && following != null && following > 0)
    ? formatCompactViews(Math.round(followers / following))
    : null;

  const SEP = <span style={{ color: '#D1D5DB' }}>|</span>;

  return (
    <div style={{ whiteSpace: 'nowrap' }}>
      {/* line 1 — followers | ratio */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, lineHeight: 1.9 }}>
        {followers != null ? (
          <span title="Followers">{formatCompactViews(followers)}</span>
        ) : (
          <span style={{ color: '#9CA3AF' }}>-</span>
        )}
        {ratio != null && <>{SEP}<span title="Followers ÷ Following">{ratio}</span></>}
      </div>

      {/* line 2 — avg views */}
      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.9 }}>
        {avgViews != null && avgViews > 0
          ? <span title="Avg Views">{formatCompactViews(avgViews)}</span>
          : <span>-</span>
        }
      </div>
    </div>
  );
}

export default InstaStatsCell;
