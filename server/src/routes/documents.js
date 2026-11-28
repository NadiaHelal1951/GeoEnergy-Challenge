// All document routes. Every route requires login (requireAuth is applied in index.js).
//
//   GET  /api/documents              list (Engineer: own only, Manager: all)
//                                    filters: ?search= &status= &department=
//   GET  /api/documents/status-counts  number of documents per status
//   POST /api/documents              upload a new document        (Engineer only)
//   GET  /api/documents/:id/file     view/download the file       (owner or Manager)
//   GET  /api/documents/:id/history  who did what and when        (owner or Manager)
//   POST /api/documents/:id/resubmit upload a corrected file      (owner Engineer, if Rejected)
//   POST /api/documents/:id/approve  approve a pending document   (Manager only)
//   POST /api/documents/:id/reject   reject with a comment        (Manager only)
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { requireRole } from '../middleware/checkLogin.js';
import { upload, UPLOAD_DIR } from '../upload.js';
import { DEPARTMENTS, DOC_TYPES, STATUSES } from '../constants.js';

const router = Router();

// ---------- helpers ----------

function findDocument(id) {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
}

function canSee(user, doc) {
  return user.role === 'Manager' || doc.owner_id === user.id;
}

function addHistory(documentId, userId, action, comment = null) {
  db.prepare('INSERT INTO history (document_id, user_id, action, comment) VALUES (?, ?, ?, ?)')
    .run(documentId, userId, action, comment);
}

// Used by approve and reject: changes the status and the manager's comment.
function setStatus(documentId, status, managerComment) {
  db.prepare(`
    UPDATE documents
    SET status = ?, manager_comment = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, managerComment, documentId);
}

// Sends an error for an upload we won't accept. Multer has already saved the
// file to the uploads folder by this point, so we delete it to avoid leftovers.
function refuseUpload(req, res, status, message) {
  if (req.file) fs.unlinkSync(req.file.path);
  return res.status(status).json({ error: message });
}

// Engineers only see their own documents. This filter is applied on the server,
// so an Engineer can't see other people's documents even by calling the API directly.
// Returns the start of a WHERE clause that the list and status-count queries build on.
function visibleTo(user) {
  return user.role === 'Engineer'
    ? { conditions: ['d.owner_id = ?'], params: [user.id] }
    : { conditions: [], params: [] };
}

function toWhere(conditions) {
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
}

// ---------- status counts (for the summary cards) ----------

// Returns how many documents have each status, e.g.
// { "Pending Approval": 2, "Approved": 1, "Rejected": 1 }
router.get('/status-counts', (req, res) => {
  const { conditions, params } = visibleTo(req.user);
  const rows = db.prepare(`
    SELECT d.status, COUNT(*) AS count
    FROM documents d
    ${toWhere(conditions)}
    GROUP BY d.status
  `).all(...params);

  // Start every status at 0 so statuses with no documents still appear.
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of rows) statusCounts[row.status] = row.count;

  res.json({ statusCounts });
});

// ---------- list ----------

// Optional query parameters: ?search=  &status=  &department=
router.get('/', (req, res) => {
  const { conditions, params } = visibleTo(req.user);

  const search = (req.query.search || '').trim();
  if (search) {
    conditions.push('d.title LIKE ?');
    params.push(`%${search}%`);
  }

  if (STATUSES.includes(req.query.status)) {
    conditions.push('d.status = ?');
    params.push(req.query.status);
  }

  if (DEPARTMENTS.includes(req.query.department)) {
    conditions.push('d.department = ?');
    params.push(req.query.department);
  }

  const where = toWhere(conditions);
  const documents = db.prepare(`
    SELECT d.id, d.title, d.department, d.doc_type, d.file_name, d.mime_type,
           d.status, d.manager_comment, d.created_at, d.updated_at,
           u.username AS owner
    FROM documents d
    JOIN users u ON u.id = d.owner_id
    ${where}
    ORDER BY d.created_at DESC, d.id DESC
  `).all(...params);

  res.json({ documents });
});

// ---------- upload ----------

// requireRole runs first, so a Manager is refused before any file is saved.
// upload.single('file') then reads the file from the form field named "file".
router.post('/', requireRole('Engineer'), upload.single('file'), (req, res) => {
  const { title, department, doc_type } = req.body;

  if (!req.file) {
    return refuseUpload(req, res, 400, 'Please choose a file');
  }
  if (!title || !title.trim()) {
    return refuseUpload(req, res, 400, 'Title is required');
  }
  if (!DEPARTMENTS.includes(department)) {
    return refuseUpload(req, res, 400, 'Please choose a valid department');
  }
  if (!DOC_TYPES.includes(doc_type)) {
    return refuseUpload(req, res, 400, 'Please choose a valid document type');
  }

  const result = db.prepare(`
    INSERT INTO documents (title, department, doc_type, file_name, file_path, mime_type, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title.trim(), department, doc_type, req.file.originalname, req.file.filename, req.file.mimetype, req.user.id);

  addHistory(result.lastInsertRowid, req.user.id, 'Submitted');

  res.status(201).json({ document: findDocument(result.lastInsertRowid) });
});

// ---------- view file ----------

router.get('/:id/file', (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc || !canSee(req.user, doc)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.setHeader('Content-Type', doc.mime_type);
  // "inline" asks the browser to display the file instead of downloading it.
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
  res.sendFile(path.join(UPLOAD_DIR, doc.file_path));
});

// ---------- history ----------

router.get('/:id/history', (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc || !canSee(req.user, doc)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // JOIN users so we can show "mona (Manager)" instead of just a user id.
  const history = db.prepare(`
    SELECT h.id, h.action, h.comment, h.created_at, u.username, u.role
    FROM history h
    JOIN users u ON u.id = h.user_id
    WHERE h.document_id = ?
    ORDER BY h.created_at, h.id
  `).all(doc.id);

  res.json({ history });
});

// ---------- resubmit (Engineer, own rejected documents only) ----------

// The Engineer uploads a corrected file; the document goes back to "Pending Approval".
// An optional note tells the Manager what was changed.
router.post('/:id/resubmit', requireRole('Engineer'), upload.single('file'), (req, res) => {
  const doc = findDocument(req.params.id);

  if (!doc || doc.owner_id !== req.user.id) {
    return refuseUpload(req, res, 404, 'Document not found');
  }
  if (doc.status !== 'Rejected') {
    return refuseUpload(req, res, 409, 'Only rejected documents can be resubmitted');
  }
  if (!req.file) {
    return refuseUpload(req, res, 400, 'Please choose the corrected file');
  }

  const note = (req.body.note || '').trim();

  db.prepare(`
    UPDATE documents
    SET file_name = ?, file_path = ?, mime_type = ?,
        status = 'Pending Approval', manager_comment = NULL, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.file.originalname, req.file.filename, req.file.mimetype, doc.id);

  addHistory(doc.id, req.user.id, 'Resubmitted', note || null);

  // The old file is no longer used by any document, so remove it from the uploads folder.
  fs.rm(path.join(UPLOAD_DIR, doc.file_path), { force: true }, () => {});

  res.json({ document: findDocument(doc.id) });
});

// ---------- approve / reject (Manager only) ----------

router.post('/:id/approve', requireRole('Manager'), (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  if (doc.status !== 'Pending Approval') {
    return res.status(409).json({ error: `This document is already ${doc.status.toLowerCase()}` });
  }

  setStatus(doc.id, 'Approved', null);
  addHistory(doc.id, req.user.id, 'Approved');

  res.json({ document: findDocument(doc.id) });
});

router.post('/:id/reject', requireRole('Manager'), (req, res) => {
  const doc = findDocument(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  if (doc.status !== 'Pending Approval') {
    return res.status(409).json({ error: `This document is already ${doc.status.toLowerCase()}` });
  }

  const comment = (req.body.comment || '').trim();
  if (!comment) {
    return res.status(400).json({ error: 'A comment is required when rejecting' });
  }

  setStatus(doc.id, 'Rejected', comment);
  addHistory(doc.id, req.user.id, 'Rejected', comment);

  res.json({ document: findDocument(doc.id) });
});

export default router;
