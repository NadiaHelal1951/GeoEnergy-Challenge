// Pop-up where an Engineer uploads a corrected file for a rejected document.
import { useState } from 'react';
import { api } from '../api';

export default function ResubmitDialog({ document, onResubmitted, onCancel }) {
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const form = new FormData();
    form.append('file', file);
    form.append('note', note);

    try {
      await api(`/documents/${document.id}/resubmit`, { method: 'POST', body: form });
      onResubmitted();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <form className="card dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Resubmit “{document.title}”</h3>

        <div className="rejection-box">
          <strong>Rejection reason:</strong> {document.manager_comment}
        </div>

        <label>
          Corrected file (PDF or image, max 10 MB)
          <input type="file" accept="application/pdf,image/*" required
                 onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <label>
          Note to the manager (optional)
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Added the missing well coordinates" />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={saving || !file}>
            {saving ? 'Uploading…' : 'Resubmit for approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
