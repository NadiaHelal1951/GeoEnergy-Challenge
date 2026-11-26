// Pop-up where the Manager must write a comment before rejecting a document.
import { useState } from 'react';

export default function RejectDialog({ document, onConfirm, onCancel }) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onConfirm(comment);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onCancel}>
      {/* stopPropagation: clicking inside the dialog shouldn't close it */}
      <form className="card dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Reject “{document.title}”</h3>
        <label>
          Reason for rejection
          <textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)}
                    required autoFocus placeholder="Tell the engineer what needs to be fixed" />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="danger" disabled={saving || !comment.trim()}>
            {saving ? 'Rejecting…' : 'Reject document'}
          </button>
        </div>
      </form>
    </div>
  );
}
