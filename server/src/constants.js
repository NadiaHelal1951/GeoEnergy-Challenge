// Allowed values for dropdowns. The server validates against these,
// and the client fetches them from GET /api/options so they live in one place.

export const DEPARTMENTS = ['Exploration', 'Production', 'Drilling', 'Reservoir', 'Management'];

export const DOC_TYPES = [
  'Geological Report',
  'Seismic Interpretation',
  'Well Log',
  'Drilling Program',
  'Monthly Production Report',
];

export const STATUSES = ['Pending Approval', 'Approved', 'Rejected'];

// Only PDFs and images can be uploaded.
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export const MAX_FILE_SIZE_MB = 10;
