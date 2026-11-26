// All document routes. Every route requires login (requireAuth is applied in index.js).
//
//   GET  /api/documents              list (Engineer: own only, Manager: all) + ?search=
//   POST /api/documents              upload a new document        (Engineer only)
//   GET  /api/documents/:id/file     view/download the file       (owner or Manager)
//   POST /api/documents/:id/approve  approve a pending document   (Manager only)
//   POST /api/documents/:id/reject   reject with a comment        (Manager only)
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import db from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { upload, UPLOAD_DIR } from '../upload.js';
import { DEPARTMENTS, DOC_TYPES } from '../constants.js';

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

// ---------- list ----------

router.get('/', (req, res) => {
  const conditions = [];
  const params = [];

  // Engineers only see their own documents. This filter is applied on the server,
  // so an Engineer can't see other people's documents even by calling the API directly.
  if (req.user.role === 'Engineer') {
    conditions.push('d.owner_id = ?');
    params.push(req.user.id);
  }

  const search = (req.query.search || '').trim();
  if (search) {
    conditions.push('d.title LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
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

  const error =
    !req.file ? 'Please choose a file' :
    !title?.trim() ? 'Title is required' :
    !DEPARTMENTS.includes(department) ? 'Please choose a valid department' :
    !DOC_TYPES.includes(doc_type) ? 'Please choose a valid document type' :
    null;

  if (error) {
    if (req.file) fs.unlinkSync(req.file.path); // don't keep files for rejected uploads
    return res.status(400).json({ error });
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

// ---------- approve / reject (Manager only) ----------

function decide(newStatus) {
  return (req, res) => {
    const doc = findDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'Pending Approval') {
      return res.status(409).json({ error: `This document is already ${doc.status.toLowerCase()}` });
    }

    const comment = (req.body.comment || '').trim();
    if (newStatus === 'Rejected' && !comment) {
      return res.status(400).json({ error: 'A comment is required when rejecting' });
    }

    db.prepare(`
      UPDATE documents
      SET status = ?, manager_comment = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, comment || null, doc.id);

    addHistory(doc.id, req.user.id, newStatus, comment || null);

    res.json({ document: findDocument(doc.id) });
  };
}

router.post('/:id/approve', requireRole('Manager'), decide('Approved'));
router.post('/:id/reject', requireRole('Manager'), decide('Rejected'));

export default router;
