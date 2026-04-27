// InstaStatusCell.jsx
// Correctly formats datetime strings like "2022-06-04 09:30:57" → "04-Jun-2022"
// Never skips 1970-01-01 — shows it if present

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Parse a DB datetime string "YYYY-MM-DD HH:mm:ss" → "DD-Mon-YYYY"
 * Returns null if the string is empty, null, or "0000-00-00 ..."
 */
function formatDbDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str || str.startsWith('0000-00-00')) return null;

  // Take only the date part before the space
  const datePart = str.split(' ')[0];
  const parts    = datePart.split('-');
  if (parts.length !== 3) return null;

  const year  = parts[0];
  const month = parseInt(parts[1], 10);
  const day   = String(parseInt(parts[2], 10)).padStart(2, '0');

  if (isNaN(month) || month < 1 || month > 12) return null;
  return `${day}-${MONTHS[month - 1]}-${year}`;
}

const STATUS_MAP = {
  0: { label: 'Unconfirmed', cls: 'bg-red-100 text-red-800'       },
  1: { label: 'Confirmed',   cls: 'bg-orange-100 text-orange-800' },
  2: { label: 'Managed',     cls: 'bg-teal-100 text-teal-800'     },
  3: { label: 'Followed',    cls: 'bg-blue-100 text-blue-800'     },
  4: { label: 'Suspended',   cls: 'bg-red-100 text-red-800'       },
};

function InstaStatusCell({ insta }) {
  const statusNum  = insta.ig_status != null ? Number(insta.ig_status) : null;
  const statusInfo = STATUS_MAP[statusNum] ?? { label: 'Unknown', cls: 'bg-gray-100 text-gray-800' };

  const addedFmt   = formatDbDate(insta.ig_added_date  || insta.added_date);
  const confirmedFmt = formatDbDate(insta.confirmed_on);
  const updatedFmt = formatDbDate(insta.updated_date);

  return (
    <div>
      {/* status badge */}
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.cls}`}
        style={{ fontSize: 13 }}>
        {statusInfo.label}
      </span>

      {statusNum === 2 && insta.ig_managedby && (
        <div style={{ fontSize: 13, color: '#4B5563', marginTop: 2 }}>
          By {insta.ig_managedby}
        </div>
      )}

      {/* date icons — show ALL valid dates, hover shows correct label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        {addedFmt && (
          <span title={`Added Date - ${addedFmt}`} style={{ cursor: 'help', fontSize: 14 }}>📅</span>
        )}
        {confirmedFmt && (
          <span title={`Confirm Date - ${confirmedFmt}`} style={{ cursor: 'help', fontSize: 14 }}>✅</span>
        )}
        {updatedFmt && (
          <span title={`Updated Date - ${updatedFmt}`} style={{ cursor: 'help', fontSize: 14 }}>🔄</span>
        )}
        {!addedFmt && !confirmedFmt && !updatedFmt && (
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>-</span>
        )}
      </div>
    </div>
  );
}

export default InstaStatusCell;
