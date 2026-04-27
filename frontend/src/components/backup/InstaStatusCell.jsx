// InstaStatusCell.jsx
// Status badge (0-4) + 3 date icons matching YT StatusCell style

// Parse date string → DD-Mon-YYYY (no timezone conversion)
function formatDate(dateStr) {
  if (!dateStr) return '';
  const dateOnly = String(dateStr).trim().split(/\s/)[0] || '';
  if (!dateOnly || dateOnly === '0000-00-00' || dateOnly === '1970-01-01') return '';
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const year  = parts[0].length === 4 ? parts[0] : parts[2];
  const month = parts[0].length === 4 ? parseInt(parts[1], 10) : parseInt(parts[1], 10);
  const day   = parts[0].length === 4 ? parts[2] : parts[0];
  if (isNaN(month) || month < 1 || month > 12) return '';
  return `${day}-${months[month - 1]}-${year}`;
}

const STATUS_MAP = {
  0: { label: 'Unconfirmed', cls: 'bg-red-100 text-red-800'    },
  1: { label: 'Confirmed',   cls: 'bg-orange-100 text-orange-800' },
  2: { label: 'Managed',     cls: 'bg-teal-100 text-teal-800'  },
  3: { label: 'Followed',    cls: 'bg-blue-100 text-blue-800'  },
  4: { label: 'Suspended',   cls: 'bg-red-100 text-red-800'    },
};

function InstaStatusCell({ insta }) {
  const statusNum  = insta.ig_status != null ? Number(insta.ig_status) : null;
  const statusInfo = STATUS_MAP[statusNum] ?? { label: 'Unknown', cls: 'bg-gray-100 text-gray-800' };

  const confirmedOn = formatDate(insta.confirmed_on);
  const addedDate   = formatDate(insta.ig_added_date || insta.added_date);
  const updatedDate = formatDate(insta.updated_date);

  const isValidDate = (d) => !!d;

  return (
    <div>
      {/* status badge */}
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.cls}`}>
        {statusInfo.label}
      </span>
      {statusNum === 2 && insta.ig_managedby && (
        <div className="mt-1 text-xs text-gray-600">By {insta.ig_managedby}</div>
      )}

      {/* date icons — same style as YT StatusCell */}
      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
        {isValidDate(addedDate) && (
          <span title={`Added Date - ${addedDate}`} className="cursor-help">📅</span>
        )}
        {isValidDate(confirmedOn) && (
          <span title={`Confirm Date - ${confirmedOn}`} className="cursor-help">✅</span>
        )}
        {isValidDate(updatedDate) && (
          <span title={`Last Update Date - ${updatedDate}`} className="cursor-help">🔄</span>
        )}
      </div>
    </div>
  );
}

export default InstaStatusCell;
