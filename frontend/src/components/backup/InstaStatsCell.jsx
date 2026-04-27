// InstaStatsCell.jsx
// Line 1: Followers | Followers÷Following ratio
// Line 2: Influencer Score

import { formatCompactViews } from '../utils/format';

function InstaStatsCell({ insta }) {
  const followers = insta.followers != null && insta.followers !== '' ? Number(insta.followers) : null;
  const following = insta.following != null && insta.following !== '' ? Number(insta.following) : null;
  const infScore  = insta.inf_score != null && insta.inf_score !== '' ? Number(insta.inf_score) : null;

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
        {ratio != null && <>{SEP}<span title="Followers / Following">{ratio}</span></>}
      </div>

      {/* line 2 — influencer score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#6B7280', lineHeight: 1.9 }}>
        {infScore != null ? (
          <span title="Influencer Score">{infScore}</span>
        ) : (
          <span>-</span>
        )}
      </div>
    </div>
  );
}

export default InstaStatsCell;
