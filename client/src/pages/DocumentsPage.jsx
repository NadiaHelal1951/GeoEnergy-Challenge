// Main page: summary counts, filters and the document list.
// Engineers see their own documents and can upload; Managers see all and can approve/reject.
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';
import { formatDate } from '../format';
import DocumentDetails from '../components/DocumentDetails';
import StatusBadge from '../components/StatusBadge';
import SummaryCards from '../components/SummaryCards';
import UploadForm from '../components/UploadForm';
import RejectDialog from '../components/RejectDialog';
import ResubmitDialog from '../components/ResubmitDialog';

export default function DocumentsPage() {
  const { user } = useAuth();
  const isManager = user.role === 'Manager';

  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [rejecting, setRejecting] = useState(null); // the document being rejected, or null
  const [viewing, setViewing] = useState(null);     // the document whose details are open, or null
  const [resubmitting, setResubmitting] = useState(null); // the rejected document being resubmitted, or null

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const hasFilters = search || status || department;

  const loadDocuments = useCallback(async () => {
    try {
      // Only include the filters that are set, e.g. "?status=Approved&department=Exploration"
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (department) params.set('department', department);
      const query = params.toString() ? `?${params}` : '';

      const data = await api(`/documents${query}`);
      setDocuments(data.documents);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, department]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await api('/documents/summary');
      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // After an upload, approval or rejection, both the list and the counts change.
  function refresh() {
    loadDocuments();
    loadSummary();
  }

  // Reload the list when a filter changes, waiting 300 ms after the
  // user stops typing so we don't send a request for every key press.
  useEffect(() => {
    const timer = setTimeout(loadDocuments, 300);
    return () => clearTimeout(timer);
  }, [loadDocuments]);

  // Load the counts and the dropdown values once when the page opens.
  useEffect(() => {
    loadSummary();
    api('/options').then(setOptions).catch((err) => setError(err.message));
  }, [loadSummary]);

  function clearFilters() {
    setSearch('');
    setStatus('');
    setDepartment('');
  }

  async function approve(doc) {
    try {
      await api(`/documents/${doc.id}/approve`, { method: 'POST' });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reject(doc, comment) {
    await api(`/documents/${doc.id}/reject`, { method: 'POST', body: { comment } });
    setRejecting(null);
    refresh();
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
          onUploaded={() => { setShowUpload(false); refresh(); }}
        />
      )}

      <SummaryCards summary={summary} activeStatus={status} onSelect={setStatus} />

      <div className="card">
        <div className="filters">
          <input
            className="search"
            type="search"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {options?.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Filter by department">
            <option value="">All departments</option>
            {options?.departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          {hasFilters && (
            <button className="secondary" onClick={clearFilters}>Clear filters</button>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="muted empty">
            {hasFilters ? 'No documents match your filters.' :
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
                      <button className="link" onClick={() => setViewing(doc)}>{doc.title}</button>
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
                      {!isManager && doc.status === 'Rejected' && (
                        <button onClick={() => setResubmitting(doc)}>Resubmit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && <DocumentDetails document={viewing} onClose={() => setViewing(null)} />}

      {resubmitting && (
        <ResubmitDialog
          document={resubmitting}
          onCancel={() => setResubmitting(null)}
          onResubmitted={() => { setResubmitting(null); refresh(); }}
        />
      )}

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
