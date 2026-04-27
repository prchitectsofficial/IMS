// InstaChannelCell.jsx
// IG logo rendered by InfluencerTable — NOT here

const DASH = <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>;

function InstaChannelCell({ insta }) {
  const username   = insta.username   || '';
  const name       = insta.ig_name    || username;
  const bio        = insta.bio        || '';
  const emails     = insta.emails     || '';
  const phone      = insta.ig_phone   || '';
  const website    = insta.website    || '';
  const category   = insta.category   ? String(insta.category).trim() : '';
  // Capitalize first letter of each word in category
  const categoryDisplay = category
    ? category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : '';
  const hasPartner = Number(insta.has_partnership) > 0;
  const hasBarter  = insta.barter === 1 || insta.barter === '1' || insta.barter === true;

  const displayUser = username
    ? (username.length > 10 ? username.slice(0, 10) + '...' : username)
    : null;
  const initials  = username.slice(0, 2).toUpperCase() || '?';
  const instaUrl  = username ? `https://www.instagram.com/${username}` : '#';

  return (
    <div>
      {/* main line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexWrap: 'nowrap' }}>

        {/* circle avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: '#993556',
          color: '#fff', fontSize: 11, fontWeight: 500, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {initials}
        </div>

        {/* username */}
        {displayUser ? (
          <a href={instaUrl} target="_blank" rel="noopener noreferrer" title={name}
            style={{
              fontWeight: 500, fontSize: 14, color: '#993556',
              textDecoration: 'none', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 85
            }}>
            {displayUser}
          </a>
        ) : DASH}

        {/* @ email */}
        {emails ? (
          <span title={`Conversation email - ${emails}`}
            style={{ color: '#185FA5', fontWeight: 600, fontSize: 14, cursor: 'help' }}>
            @
          </span>
        ) : null}

        {/* phone */}
        {phone ? (
          <span title={`Contact - ${phone}`} style={{ display: 'inline-flex', cursor: 'help', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#185FA5">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </span>
        ) : null}

        {/* website */}
        {website ? (
          <span title={`Website - ${website}`} style={{ display: 'inline-flex', cursor: 'help', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#185FA5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </span>
        ) : null}

        {/* i icon — hover shows full bio */}
        {bio ? (
          <span
            title={`insta bio - ${bio}`}
            style={{ display: 'inline-flex', cursor: 'help', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="#185FA5">
              <rect x="1" y="1" width="30" height="30" rx="8" ry="8"/>
              <text
                x="16" y="23"
                textAnchor="middle"
                fontSize="18"
                fontWeight="bold"
                fontFamily="Georgia, serif"
                fill="white"
              >i</text>
            </svg>
          </span>
        ) : null}

        {/* barter icon */}
        {hasBarter && (
          <span title="Accepts Barter" style={{ display: 'inline-flex', cursor: 'help', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#185FA5">
              <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
            </svg>
          </span>
        )}

        {/* eye — paid partnership */}
        {hasPartner ? (
          <span title="View paid partnership posts" style={{ display: 'inline-flex', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </span>
        ) : null}
      </div>

      {/* second line — category */}
      <div style={{
        fontSize: 13, color: '#6B7280', marginTop: 2, paddingLeft: 32,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190,
      }}>
        {categoryDisplay || '-'}
      </div>
    </div>
  );
}

export default InstaChannelCell;
