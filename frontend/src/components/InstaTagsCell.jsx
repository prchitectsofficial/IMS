// InstaTagsCell.jsx
// DB format: {"bollywood":{"score":45,"category_id":"1"},"news":{"score":15}}
// ES may return tags as already-parsed object — handle both string and object

function InstaTagsCell({ insta }) {
  const rawTags = insta.ig_tags || insta.tags;

  const niches = (() => {
    // No value at all
    if (rawTags == null) return [];

    // Already a parsed object from ES (not a string)
    if (typeof rawTags === 'object' && !Array.isArray(rawTags)) {
      return Object.keys(rawTags).filter(Boolean)
        .map(k => k.charAt(0).toUpperCase() + k.slice(1));
    }

    // Empty array [] or stringified empty
    if (Array.isArray(rawTags)) return [];

    const str = String(rawTags).trim();

    // Empty string, '""', '{}', '[]'
    if (!str || str === '""' || str === '{}' || str === '[]') return [];

    // Try JSON parse
    try {
      const parsed = JSON.parse(str);
      // parsed object like {"bollywood":{...}}
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.keys(parsed).filter(Boolean)
          .map(k => k.charAt(0).toUpperCase() + k.slice(1));
      }
      // parsed empty array
      if (Array.isArray(parsed) && parsed.length === 0) return [];
      // parsed array of strings
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map(t => String(t).charAt(0).toUpperCase() + String(t).slice(1));
      }
    } catch (_) {}

    // Fallback: comma-separated plain string
    return str.split(',')
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
        <div key={i} style={{ fontSize: 14, lineHeight: 1.7 }}>{niche}</div>
      ))}
    </div>
  );
}

export default InstaTagsCell;
