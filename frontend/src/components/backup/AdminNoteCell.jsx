function AdminNoteCell({ influencer, onCommentsClick }) {
  const count = influencer.admin_notes_count != null ? Number(influencer.admin_notes_count) : 0;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onCommentsClick}
        className={`p-1.5 rounded flex items-center justify-center gap-1 text-sm font-medium ${
          count > 0 ? 'bg-green-100 text-green-800' : 'bg-white border border-gray-300 text-gray-700'
        }`}
        title="Admin Notes"
      >
        <span aria-hidden>💬</span>
        {count > 0 && <span className="min-w-[1.25rem]">{count}</span>}
      </button>
    </div>
  );
}

export default AdminNoteCell;
