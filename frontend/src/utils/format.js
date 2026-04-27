/**
 * Format a numeric score to exactly 2 decimal places (proper rounding).
 * Used in TAGS column and anywhere niche(score) is displayed.
 */
export function formatScoreTwoDecimals(val) {
  if (val == null || val === '') return '';
  const num = Number(val);
  if (Number.isNaN(num)) return String(val);
  return num.toFixed(2);
}

/**
 * Format average views in compact notation: K (thousands), L (lakhs), M (million).
 * e.g. 5000 -> 5K, 100000 -> 1L, 1000000 -> 1M
 */
export function formatCompactViews(num) {
  if (num == null || num === '') return '-';
  const n = Number(num);
  if (Number.isNaN(n) || n < 0) return '-';
  if (n >= 1e6) {
    const m = n / 1e6;
    return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (n >= 1e5) {
    const l = n / 1e5;
    return l % 1 === 0 ? `${l}L` : `${l.toFixed(1)}L`;
  }
  if (n >= 1e3) {
    const k = n / 1e3;
    return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(n);
}
