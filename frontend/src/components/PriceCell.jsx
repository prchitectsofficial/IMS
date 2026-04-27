import { formatCompactViews } from '../utils/format';

function PriceCell({ influencer }) {
  const currency = influencer.currency || 'INR';
  const ytPrice = influencer.yt_price != null && influencer.yt_price !== '' ? formatCompactViews(influencer.yt_price) : null;
  
  // Check if fair_price exists and is not 0 or blank
  const hasFairPrice = influencer.fair_price && 
                       influencer.fair_price !== 0 && 
                       influencer.fair_price !== '0' && 
                       influencer.fair_price !== '';
  
  // Tooltip text: show fair_price on hover, or show "--" if blank/0
  const tooltipText = hasFairPrice
    ? `Fair Price: ${influencer.fair_price}`
    : `Fair Price: ${currency} --`;

  if (!ytPrice) {
    return <span>-</span>;
  }

  return (
    <span
      className="cursor-help"
      title={tooltipText}
    >
      {currency} {ytPrice}
    </span>
  );
}

export default PriceCell;

