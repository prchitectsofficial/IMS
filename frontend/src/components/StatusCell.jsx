// Format date for display: DD-Mon-YYYY (e.g. 05-Feb-2021). No timezone conversion — parse string only.
function formatDate(dateStr) {
  if (!dateStr) return '';
  const dateOnly = String(dateStr).trim().split(/\s/)[0] || '';
  if (!dateOnly || dateOnly === '0000-00-00') return '';
  const parts = dateOnly.split('-');
  if (parts.length !== 3) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let year, month, day;
  if (parts[0].length === 4) {
    year = parts[0];
    month = parseInt(parts[1], 10);
    day = parts[2];
  } else {
    day = parts[0];
    month = parseInt(parts[1], 10);
    year = parts[2];
  }
  if (Number.isNaN(month) || month < 1 || month > 12) return '';
  return `${day}-${months[month - 1]}-${year}`;
}

function StatusCell({ influencer }) {
  // Get status from influencer object (backend maps confirmed to status text)
  const getStatusFromConfirmed = (confirmed) => {
    if (confirmed === 1) return 'Unconfirmed';
    if (confirmed === 2) return 'Auto Mail';
    if (confirmed === 3) return 'Manual Mail';
    if (confirmed === 4) return 'Responded';
    if (confirmed === 5) return 'Confirmed';
    if (confirmed === 6) return 'Managed';
    if (confirmed === 7) return 'Suspended';
    if (confirmed === 9) return 'BMI';
    if (confirmed === 10) return 'Confirmed PPC';
    return influencer.status || 'Unknown';
  };

  const status = influencer.status || getStatusFromConfirmed(influencer.confirmed);
  const confirmedValue = influencer.confirmedValue || influencer.confirmed;

  const getStatusColor = (statusText) => {
    switch (statusText) {
      case 'Confirmed':
        return 'bg-orange-100 text-orange-800';
      case 'Unconfirmed':
        return 'bg-red-100 text-red-800';
      case 'Managed':
        return 'bg-teal-100 text-teal-800';
      case 'Auto Mail':
      case 'Manual Mail':
      case 'Responded':
        return 'bg-teal-100 text-teal-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      case 'BMI':
      case 'Confirmed PPC':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-1">
      <div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
        {confirmedValue === 6 && influencer.managedby && (
          <div className="mt-1">
            <span className="text-xs text-gray-600">By {influencer.managedby}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        {influencer.added_date && influencer.added_date !== '0000-00-00 00:00:00' && (
          <span title={formatDate(influencer.added_date) ? `Added date - ${formatDate(influencer.added_date)}` : 'Added date'} className="cursor-help">📅</span>
        )}
        {influencer.conf_date && influencer.conf_date !== '0000-00-00 00:00:00' && influencer.conf_date !== '0000-00-00' && (
          <span title={formatDate(influencer.conf_date) ? `Confirm date - ${formatDate(influencer.conf_date)}` : 'Confirm date'} className="cursor-help">✅</span>
        )}
        {influencer.last_updated && influencer.last_updated !== '0000-00-00 00:00:00' && (
          <span title={formatDate(influencer.last_updated) ? `Last update - ${formatDate(influencer.last_updated)}` : 'Last update'} className="cursor-help">🔄</span>
        )}
      </div>
    </div>
  );
}

export default StatusCell;

