import { useState, useEffect } from 'react';
import api from '../config/api';

function formatDateOnly(dateVal) {
  if (dateVal == null || dateVal === '') return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function CommentsModal({ influencerId, onClose, onUpdate }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [savingEditId, setSavingEditId] = useState(null);

  const fetchComments = async () => {
    if (!influencerId) return;
    setLoading(true);
    try {
      const response = await api.get(`/comments/${influencerId}`);
      const list = response.data.comments || [];
      setComments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [influencerId]);

  const handleAddComment = async () => {
    const note = newComment.trim();
    if (!note) {
      alert('Note cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/comments/${influencerId}`, {
        comment: note,
        addedBy: 'Admin'
      });
      setNewComment('');
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      const msg = error.response?.data?.error || error.message || 'Error adding comment';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEditStart = (c) => {
    setEditingId(c.id);
    setEditingText(c.note || '');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleEditSave = async () => {
    const note = editingText.trim();
    if (!note) {
      alert('Note cannot be empty');
      return;
    }
    setSavingEditId(editingId);
    try {
      await api.put(`/comments/note/${editingId}`, { note });
      setEditingId(null);
      setEditingText('');
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert(error.response?.data?.error || 'Error updating note');
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteComment = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/comments/${influencerId}`, {
        data: { noteId }
      });
      await fetchComments();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.response?.data?.error || 'Error deleting comment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden m-4 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Admin Notes</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-gray-500">Loading comments…</p>
          ) : (
            <div className="mb-6">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contributor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {comments.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No comments yet.</td>
                    </tr>
                  ) : (
                    comments.map((c, index) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-800">
                          {editingId === c.id ? (
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="break-words">{c.note}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{c.created_by || '—'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{formatDateOnly(c.created_on)}</td>
                        <td className="px-4 py-2">
                          {editingId === c.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleEditSave}
                                disabled={savingEditId === c.id}
                                className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                              >
                                {savingEditId === c.id ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={handleEditCancel}
                                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditStart(c)}
                                className="text-blue-600 hover:text-blue-800 p-1"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">New Note</h3>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="w-full px-3 py-2 border border-gray-300 rounded mb-2 resize-y min-h-[80px]"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddComment}
                disabled={saving || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentsModal;
