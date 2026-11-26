// Pop-up showing one document: its details, a preview of the file, and its history.
import { useEffect, useState } from 'react';
import { api, openDocumentFile } from '../api';
import { formatDate } from '../format';
import FilePreview from './FilePreview';
import StatusBadge from './StatusBadge';

export default function DocumentDetails({ document, onClose }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');

  // Load the history whenever a different document is opened.
  useEffect(() => {
    api(`/documents/${document.id}/history`)
      .then((data) => setHistory(data.history))
      .catch((err) => setError(err.message));
  }, [document.id]);

  async function openFile() {
    try {
      await openDocumentFile(document.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="card dialog wide" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{document.title}</h3>
          <button className="icon" onClick={onClose} aria-label="Close">×</button>
        </div>

        <dl className="details">
          <dt>Status</dt>       <dd><StatusBadge status={document.status} /></dd>
          <dt>Type</dt>         <dd>{document.doc_type}</dd>
          <dt>Department</dt>   <dd>{document.department}</dd>
          <dt>Submitted by</dt> <dd>{document.owner}</dd>
          <dt>Submitted on</dt> <dd>{formatDate(document.created_at)}</dd>
          <dt>File</dt>
          <dd>
            {document.file_name}{' '}
            <button className="link" onClick={openFile}>(open in new tab)</button>
          </dd>
        </dl>

        <FilePreview document={document} />

        <h4>History</h4>
        {error && <p className="error">{error}</p>}
        {!history && !error && <p className="muted">Loading…</p>}
        {history && (
          <ol className="history">
            {history.map((h) => (
              <li key={h.id} className={`history-item ${h.action.toLowerCase()}`}>
                <div>
                  <strong>{h.action}</strong> by {h.username} ({h.role})
                </div>
                <div className="muted small">{formatDate(h.created_at)}</div>
                {h.comment && <div className="history-comment">“{h.comment}”</div>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
