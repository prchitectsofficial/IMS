// InstaPriceCell.jsx — range format (min-max) + clickable i icon popup

import { useState, useEffect, useRef } from 'react';
import { formatCompactViews } from '../utils/format';

function rawVal(val) {
  const n = Number(val);
  return (!isNaN(n) && n > 0) ? n : null;
}

function fmt(n) {
  return n != null ? formatCompactViews(n) : null;
}

function InstaPriceCell({ insta }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const cur = insta.ig_currency || insta.currency || 'INR';

  // All price fields with labels
  const priceFields = [
    { label: 'Reel Asking Price',    val: rawVal(insta.inf_price) },
    { label: 'Reel Pitching Price',  val: rawVal(insta.pitching_reel_price) },
    { label: 'Post Asking Price',    val: rawVal(insta.pitching_price) },
    { label: 'Post Pitching Price',  val: rawVal(insta.pitching_post_price) },
    { label: 'Story Asking Price',   val: rawVal(insta.story_price) },
    { label: 'Story Pitching Price', val: rawVal(insta.pitching_story_price) },
    { label: 'Fair Price',           val: rawVal(insta.fair_price) },
  ].filter(f => f.val != null);

  // Close popup when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!priceFields.length) {
    return <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>;
  }

  // Min and max across all price values
  const values = priceFields.map(f => f.val);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const rangeStr = minVal === maxVal
    ? `${cur} ${fmt(minVal)}`
    : `${cur} ${fmt(minVal)} - ${fmt(maxVal)}`;

  return (
    <div ref={ref} style={{ position: 'relative', whiteSpace: 'nowrap' }}>
      {/* Range display + info icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14 }}>
        <span style={{ fontWeight: 500 }}>{rangeStr}</span>

        {/* clickable i icon */}
        <span
          onClick={() => setOpen(o => !o)}
          title="View all prices"
          style={{ display: 'inline-flex', cursor: 'pointer', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="#185FA5">
            <rect x="1" y="1" width="30" height="30" rx="8" ry="8"/>
            <text x="16" y="23" textAnchor="middle" fontSize="18" fontWeight="bold" fontFamily="Georgia, serif" fill="white">i</text>
          </svg>
        </span>
      </div>

      {/* Popup */}
      {open && (
        <div style={{
          position: 'absolute', top: 24, left: 0, zIndex: 999,
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.13)',
          padding: '10px 14px', minWidth: 240,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1E40AF', marginBottom: 8, borderBottom: '1px solid #E5E7EB', paddingBottom: 6 }}>
            All Prices ({cur})
          </div>
          {priceFields.map(f => (
            <div key={f.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, padding: '3px 0', color: '#374151',
              borderBottom: '1px solid #F9FAFB'
            }}>
              <span style={{ color: '#6B7280', marginRight: 12 }}>{f.label}</span>
              <span style={{ fontWeight: 500, color: '#111827' }}>{cur} {fmt(f.val)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstaPriceCell;
