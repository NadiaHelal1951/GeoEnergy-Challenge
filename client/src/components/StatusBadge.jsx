// Coloured label for a document status.
const CLASS_BY_STATUS = {
  'Pending Approval': 'badge pending',
  Approved: 'badge approved',
  Rejected: 'badge rejected',
};

export default function StatusBadge({ status }) {
  return <span className={CLASS_BY_STATUS[status] || 'badge'}>{status}</span>;
}
