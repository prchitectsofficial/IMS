// InstaTagsCell.jsx
// DB format: {"bollywood":{"score":45,"category_id":"1"},"news":{"score":15}}
// Display: one niche per line, same font size as YT tags

function InstaTagsCell({ insta }) {
  const rawTags = insta.ig_tags || insta.tags || '';

  const niches = (() => {
    if (!rawTags || rawTags === '""' || rawTags === '{}') return [];
    try {
      const parsed = typeof rawTags === 'string' ? JSON.parse(rawTags) : rawTags;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.keys(parsed)
          .filter(Boolean)
          .map(k => k.charAt(0).toUpperCase() + k.slice(1));
      }
    } catch (_) {}
    return String(rawTags)
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => t.charAt(0).toUpperCase() + t.slice(1));
  })();

  if (niches.length === 0) {
    return <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>;
  }

  return (
    <div>
      {niches.slice(0, 4).map((niche, i) => (
        <div key={i} style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)' }}>
          {niche}
        </div>
      ))}
    </div>
  );
}

export default InstaTagsCell;
