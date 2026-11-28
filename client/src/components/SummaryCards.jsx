// Three cards at the top of the page: how many documents are pending, approved and rejected.
// Clicking a card filters the list by that status; clicking it again clears the filter.
const CARDS = [
  { status: 'Pending Approval', label: 'Pending', className: 'pending' },
  { status: 'Approved', label: 'Approved', className: 'approved' },
  { status: 'Rejected', label: 'Rejected', className: 'rejected' },
];

// statusCounts comes from GET /api/documents/status-counts, e.g. { "Approved": 3, ... }
export default function SummaryCards({ statusCounts, activeStatus, onSelect }) {
  return (
    <div className="summary">
      {CARDS.map(({ status, label, className }) => (
        <button
          key={status}
          className={`summary-card ${className} ${activeStatus === status ? 'active' : ''}`}
          onClick={() => onSelect(activeStatus === status ? '' : status)}
        >
          <span className="summary-count">{statusCounts ? statusCounts[status] : '–'}</span>
          <span className="summary-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
