import { useState } from 'react';
import { formatScoreTwoDecimals } from '../utils/format';

function ChannelCell({ influencer, onPromotionsClick }) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name) => {
    if (!name || name === '-') return '?';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const channelName = influencer.channel_name || '-';
  const displayName = channelName.length > 15 ? channelName.slice(0, 15) + '...' : channelName;
  const initials    = getInitials(channelName);

  // ES may return image_path as 'image_path' or 'imagePath' — check both
  const imagePath = influencer.image_path || influencer.imagePath || influencer.profile_image || null;
  const showImage = imagePath && !imageError;

  const channelColumn = influencer.channel && String(influencer.channel).trim();
  const youtubeChannelUrl = channelColumn
    ? (channelColumn.startsWith('http://') || channelColumn.startsWith('https://')
        ? channelColumn
        : channelColumn.startsWith('/channel/')
          ? `https://www.youtube.com${channelColumn}`
          : `https://www.youtube.com/channel/${channelColumn}`)
    : null;

  const hasValue = (v) => v != null && v !== '' && String(v).trim() !== '' && v !== 0 && v !== '0';

  const createdAt   = influencer.created_at || influencer.added_date;
  const isNewChannel = (() => {
    if (!createdAt) return false;
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return false;
    return (new Date() - d) / (1000 * 60 * 60 * 24) <= 90;
  })();

  const videosNum      = Number(influencer.videos);
  const notEnoughVideos = !isNaN(videosNum) && videosNum <= 5;
  const isOneHit        = influencer.onehit === 1 || influencer.onehit === '1' || influencer.onehit === true;

  return (
    <div className="space-y-1.5">
      {/* Line 1: Thumbnail + Channel Name */}
      <div className="flex items-center gap-2">
        {showImage ? (
          youtubeChannelUrl ? (
            <a href={youtubeChannelUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
              <img src={imagePath} alt={channelName} width={40} height={40}
                className="rounded object-cover"
                onError={() => setImageError(true)} />
            </a>
          ) : (
            <img src={imagePath} alt={channelName} width={40} height={40}
              className="rounded object-cover flex-shrink-0"
              onError={() => setImageError(true)} />
          )
        ) : (
          <div
            className="w-10 h-10 rounded flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{ backgroundColor: `hsl(${(channelName.charCodeAt(0) || 0) % 360}, 70%, 50%)` }}
          >
            {initials}
          </div>
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          {youtubeChannelUrl ? (
            <a href={youtubeChannelUrl} target="_blank" rel="noopener noreferrer"
              className="font-medium text-black hover:underline"
              title={`Publisher name - ${influencer.name || 'N/A'} (Open YouTube channel)`}>
              {displayName}
            </a>
          ) : (
            <span className="font-medium text-black"
              title={`Publisher name - ${influencer.name || 'N/A'}`}>
              {displayName}
            </span>
          )}
          {(hasValue(influencer.conemail) || hasValue(influencer.yt_email)) && (
            <span className="cursor-help text-blue-600 font-semibold text-sm"
              title={hasValue(influencer.conemail) ? `Conversation email - ${influencer.conemail}` : `Youtube email - ${influencer.yt_email}`}>
              @
            </span>
          )}
          {hasValue(influencer.cont_number) && (
            <span className="cursor-help text-blue-600" title={`Contact number - ${influencer.cont_number}`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </span>
          )}
          {isNewChannel && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-semibold uppercase rounded bg-red-500 text-white cursor-help" title="New channel">
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Line 2: Icons */}
      <div className="flex items-center gap-2 flex-wrap ml-12 text-blue-600">
        {hasValue(influencer.price_view_ratio) && (
          <span className="cursor-help" title={`CPM value - ${formatScoreTwoDecimals(influencer.price_view_ratio)}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.31 8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.86-2.57V9c.96 0 1.71.23 2.23.67.52.44.78 1.06.78 1.8 0 .9-.5 1.57-1.25 1.95-.75.38-1.8.47-3.14.47v1.5c1.37 0 2.17.23 2.72.67.55.44.82 1.08.82 1.82 0 .93-.58 1.6-1.54 1.97-.58.24-1.3.36-2.16.36v1.52h-.91z"/>
            </svg>
          </span>
        )}
        {(influencer.barter === 1 || influencer.barter === true) && (
          <span className="cursor-help" title="Accepts Barter">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
          </span>
        )}
        {hasValue(influencer.oldcontent) && (
          <span className="cursor-help" title="Old Content">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
          </span>
        )}
        {hasValue(influencer.inf_recommend) && (
          <span className="cursor-help" title={`Highly recommended - ${influencer.inf_recommend}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8c0-3.38-1.21-6.49-3.3-8.19z"/>
            </svg>
          </span>
        )}
        {hasValue(influencer.inf_promotion) && (
          <span className="cursor-help" title={`Credible work history - ${influencer.inf_promotion}`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
        )}
        {notEnoughVideos && (
          <span className="cursor-help" title="Not Enough Videos">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
            </svg>
          </span>
        )}
        {isOneHit && (
          <span className="cursor-help" title="One Hit">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            </svg>
          </span>
        )}

        {/* Megaphone — Latest Promotions (only if channel has promotions) */}
        {influencer.promo_count != null && influencer.promo_count > 0 && (
          <span
            title={influencer.latest_promo_date
              ? `Latest Promotion - ${(() => {
                  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const d = new Date(influencer.latest_promo_date);
                  if (isNaN(d.getTime())) return influencer.latest_promo_date;
                  return `${String(d.getDate()).padStart(2,'0')}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
                })()}`
              : 'Latest Promotions'}
            style={{ display: 'inline-flex', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => onPromotionsClick && onPromotionsClick(influencer)}
          >
            {/* Megaphone in blue rounded-square box matching bio i icon style */}
            <svg width="16" height="16" viewBox="0 0 32 32" fill="#185FA5">
              <rect x="1" y="1" width="30" height="30" rx="8" ry="8"/>
              {/* Megaphone shape in white */}
              <path d="M8 13v6h3.5l4.5 4V9l-4.5 4H8z" fill="white"/>
              <path d="M20 11.5v9c1.5-.8 2.5-2.4 2.5-4.5S21.5 12.3 20 11.5z" fill="white" opacity="0.9"/>
              <path d="M22 9.5v13c2-.9 3.5-3.2 3.5-6.5S24 10.4 22 9.5z" fill="white" opacity="0.6"/>
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}

export default ChannelCell;
