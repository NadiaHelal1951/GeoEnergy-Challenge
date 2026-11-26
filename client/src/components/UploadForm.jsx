// Form an Engineer uses to upload a new document.
import { useState } from 'react';
import { api } from '../api';

export default function UploadForm({ options, defaultDepartment, onUploaded, onCancel }) {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    // FormData is how browsers send files. The field names must match what the server reads.
    const form = new FormData();
    form.append('title', title);
    form.append('department', department);
    form.append('doc_type', docType);
    form.append('file', file);

    try {
      await api('/documents', { method: 'POST', body: form });
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card upload-form" onSubmit={handleSubmit}>
      <h3>Upload a document</h3>

      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required
               placeholder="e.g. Western Desert Geological Survey" />
      </label>

      <div className="form-row">
        <label>
          Department
          <select value={department} onChange={(e) => setDepartment(e.target.value)} required>
            {options.departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>

        <label>
          Document type
          <select value={docType} onChange={(e) => setDocType(e.target.value)} required>
            <option value="" disabled>Choose a type…</option>
            {options.docTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <label>
        File (PDF or image, max 10 MB)
        <input type="file" accept="application/pdf,image/*" required
               onChange={(e) => setFile(e.target.files[0])} />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" disabled={saving}>{saving ? 'Uploading…' : 'Submit for approval'}</button>
      </div>
    </form>
  );
}
