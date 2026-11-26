// Entry point: creates the Express app, registers routes, and starts listening.
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './db.js'; // opens the database and seeds users on first run
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import { requireAuth } from './middleware/auth.js';
import { DEPARTMENTS, DOC_TYPES, STATUSES } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // lets us read JSON bodies as req.body

// ---------- API ----------

app.use('/api/auth', authRoutes);

// Everything below requires a valid login token.
app.use('/api', requireAuth);

app.get('/api/me', (req, res) => {
  res.json({ user: req.user });
});

// Dropdown values for the client.
app.get('/api/options', (req, res) => {
  res.json({ departments: DEPARTMENTS, docTypes: DOC_TYPES, statuses: STATUSES });
});

app.use('/api/documents', documentRoutes);

// Any other /api address doesn't exist.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------- React app ----------

// After "npm run build" the React app is a folder of static files (client/dist).
// If it exists, the server also serves it, so the whole app runs on one address.
// During development the React app runs separately on port 5173 instead.
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // React Router handles pages like /login in the browser, so every
  // non-API address gets the same index.html.
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ---------- errors ----------

// Catches errors thrown anywhere above (for example a wrong file type or a file that's too big).
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large (max 10 MB)' });
  }
  if (err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
