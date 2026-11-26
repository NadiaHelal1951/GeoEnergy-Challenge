// Opens the SQLite database file, creates the tables if they don't exist,
// and inserts the sample users the first time the app runs.
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data.db');

// Opening the file creates it automatically if it doesn't exist yet.
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK (role IN ('Engineer', 'Manager')),
    department    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    department      TEXT    NOT NULL,
    doc_type        TEXT    NOT NULL,
    file_name       TEXT    NOT NULL,  -- original name, shown to users
    file_path       TEXT    NOT NULL,  -- name of the stored file in uploads/
    mime_type       TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'Pending Approval'
                    CHECK (status IN ('Pending Approval', 'Approved', 'Rejected')),
    manager_comment TEXT,
    owner_id        INTEGER NOT NULL REFERENCES users(id),
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    action      TEXT    NOT NULL,  -- Submitted, Approved, Rejected, Resubmitted
    comment     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

// Sample users from the brief. Only inserted when the users table is empty.
const SAMPLE_USERS = [
  { username: 'ahmed', password: 'ahmed123', role: 'Engineer', department: 'Exploration' },
  { username: 'sara',  password: 'sara123',  role: 'Engineer', department: 'Production' },
  { username: 'mona',  password: 'mona123',  role: 'Manager',  department: 'Management' },
];

const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)'
  );
  for (const u of SAMPLE_USERS) {
    insert.run(u.username, bcrypt.hashSync(u.password, 10), u.role, u.department);
  }
  console.log('Created sample users: ahmed, sara, mona');
}

export default db;
