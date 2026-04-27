// InstaPriceCell.jsx
// Line 1: Reel asking | Reel pitching   [gap]   Post asking | Post pitching
// Line 2: Story asking | Story pitching [gap]   Fair price

import { formatCompactViews } from '../utils/format';

function v(val) {
  const n = Number(val);
  return (!isNaN(n) && n > 0) ? formatCompactViews(n) : null;
}

const SEP   = <span style={{ color: '#D1D5DB' }}>|</span>;
const GAP   = <span style={{ display: 'inline-block', width: 10 }} />;
const MUTED = { color: '#6B7280' };
const FS    = { fontSize: 14 };

function InstaPriceCell({ insta }) {
  const cur        = insta.ig_currency          || '';
  const reelAsk    = v(insta.inf_price);
  const reelPitch  = v(insta.pitching_reel_price);
  const postAsk    = v(insta.pitching_price);
  const postPitch  = v(insta.pitching_post_price);
  const storyAsk   = v(insta.story_price);
  const storyPitch = v(insta.pitching_story_price);
  const fair       = v(insta.fair_price);

  const hasLine1 = reelAsk || reelPitch || postAsk || postPitch;
  const hasLine2 = storyAsk || storyPitch || fair;

  if (!hasLine1 && !hasLine2) {
    return <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>;
  }

  return (
    <div style={{ whiteSpace: 'nowrap' }}>
      {/* line 1 — reel + post */}
      {hasLine1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1.9, ...FS }}>
          {reelAsk  && <span title="Reel asking price">{cur} {reelAsk}</span>}
          {reelAsk  && reelPitch && SEP}
          {reelPitch && <span title="Reel pitching price" style={MUTED}>{reelPitch}</span>}
          {(reelAsk || reelPitch) && (postAsk || postPitch) && GAP}
          {postAsk  && <span title="Post asking price">{postAsk}</span>}
          {postAsk  && postPitch && SEP}
          {postPitch && <span title="Post pitching price" style={MUTED}>{postPitch}</span>}
        </div>
      )}

      {/* line 2 — story + fair */}
      {hasLine2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, lineHeight: 1.9, ...FS }}>
          {storyAsk   && <span title="Story asking price">{storyAsk}</span>}
          {storyAsk   && storyPitch && SEP}
          {storyPitch && <span title="Story pitching price" style={MUTED}>{storyPitch}</span>}
          {(storyAsk || storyPitch) && fair && GAP}
          {fair && <span title="Fair price" style={MUTED}>{fair}</span>}
        </div>
      )}
    </div>
  );
}

export default InstaPriceCell;
