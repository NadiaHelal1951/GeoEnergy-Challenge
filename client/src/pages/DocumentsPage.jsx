// Main page: the document list with search.
// Engineers see their own documents and can upload; Managers see all and can approve/reject.
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api, openDocumentFile } from '../api';
import { formatDate } from '../format';
import StatusBadge from '../components/StatusBadge';
import UploadForm from '../components/UploadForm';
import RejectDialog from '../components/RejectDialog';

export default function DocumentsPage() {
  const { user } = useAuth();
  const isManager = user.role === 'Manager';

  const [documents, setDocuments] = useState([]);
  const [options, setOptions] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [rejecting, setRejecting] = useState(null); // the document being rejected, or null

  const loadDocuments = useCallback(async () => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api(`/documents${query}`);
      setDocuments(data.documents);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Reload the list when the search text changes, waiting 300 ms after the
  // user stops typing so we don't send a request for every key press.
  useEffect(() => {
    const timer = setTimeout(loadDocuments, 300);
    return () => clearTimeout(timer);
  }, [loadDocuments]);

  // Dropdown values for the upload form.
  useEffect(() => {
    api('/options').then(setOptions).catch((err) => setError(err.message));
  }, []);

  async function approve(doc) {
    try {
      await api(`/documents/${doc.id}/approve`, { method: 'POST' });
      loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reject(doc, comment) {
    await api(`/documents/${doc.id}/reject`, { method: 'POST', body: { comment } });
    setRejecting(null);
    loadDocuments();
  }

  async function viewFile(doc) {
    try {
      await openDocumentFile(doc.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>{isManager ? 'All documents' : 'My documents'}</h2>
        {!isManager && !showUpload && (
          <button onClick={() => setShowUpload(true)} disabled={!options}>+ Upload document</button>
        )}
      </div>

      {showUpload && (
        <UploadForm
          options={options}
          defaultDepartment={user.department}
          onCancel={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadDocuments(); }}
        />
      )}

      <div className="card">
        <input
          className="search"
          type="search"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="muted empty">
            {search ? 'No documents match your search.' :
             isManager ? 'No documents have been submitted yet.' :
             'You have not uploaded any documents yet.'}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Department</th>
                  {isManager && <th>Submitted by</th>}
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <button className="link" onClick={() => viewFile(doc)}>{doc.title}</button>
                      {doc.status === 'Rejected' && doc.manager_comment && (
                        <div className="comment">Rejection reason: {doc.manager_comment}</div>
                      )}
                    </td>
                    <td>{doc.doc_type}</td>
                    <td>{doc.department}</td>
                    {isManager && <td>{doc.owner}</td>}
                    <td className="nowrap">{formatDate(doc.created_at)}</td>
                    <td><StatusBadge status={doc.status} /></td>
                    <td className="row-actions">
                      {isManager && doc.status === 'Pending Approval' && (
                        <>
                          <button onClick={() => approve(doc)}>Approve</button>
                          <button className="danger" onClick={() => setRejecting(doc)}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rejecting && (
        <RejectDialog
          document={rejecting}
          onCancel={() => setRejecting(null)}
          onConfirm={(comment) => reject(rejecting, comment)}
        />
      )}
    </>
  );
}
