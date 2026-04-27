import { useState, useEffect } from 'react';
import api from '../config/api';

function formatDate(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function InstaCommentsModal({ igId, onClose, onUpdate }) {
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving]       = useState(false);

  const fetchComments = async () => {
    if (!igId) return;
    setLoading(true);
    try {
      const res = await api.get(`/insta/comments/${igId}`);
      setComments(Array.isArray(res.data.comments) ? res.data.comments : []);
    } catch (err) {
      console.error('Error fetching IG comments:', err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComments(); }, [igId]);

  const handleAdd = async () => {
    const note = newComment.trim();
    if (!note) { alert('Comment cannot be empty'); return; }
    setSaving(true);
    try {
      await api.post(`/insta/comments/${igId}`, { comment: note, addedBy: 'Admin' });
      setNewComment('');
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Error adding comment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/insta/comments`, { data: { noteId } });
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting comment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col m-4">

        {/* header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Add Comments</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* comments table */}
          {loading ? (
            <p className="text-gray-500 text-sm">Loading comments…</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded mb-5 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-10">Sr No</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Added By</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {comments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-400">No comments yet.</td>
                  </tr>
                ) : (
                  comments.map((c, idx) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-gray-800 break-words">{c.note}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(c.created_on)}</td>
                      <td className="px-3 py-2 text-gray-500">{c.created_by || '—'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a 1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* add comment */}
          <div className="border-t pt-4">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add Comment"
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-y min-h-[80px] mb-3"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={onClose}
                className="px-5 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                Close
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !newComment.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstaCommentsModal;
