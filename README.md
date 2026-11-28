# GeoEnergy · Document Approval

A small web application that moves technical documents through an approval workflow.
An **Engineer** uploads a document, a **Manager** approves or rejects it, and a rejected
document can be corrected and resubmitted.

```
Engineer uploads ──► Pending Approval ──► Manager approves ──► Approved
                           ▲          └──► Manager rejects ──► Rejected (with comment)
                           └────────── Engineer resubmits ◄──────┘
```

---

## Quick start

**Requirements:** [Node.js](https://nodejs.org/) 18 or newer (tested on Node 18.20).
Nothing else is needed: the database is a file that is created automatically.

```bash
git clone https://github.com/NadiaHelal1951/GeoEnergy-Challenge.git
cd GeoEnergy-Challenge
npm install      # installs the server and client (about 2 minutes)
npm start        # builds the React app and starts the server
```

Open **http://localhost:4000** and sign in with one of the accounts below.

On first start, the server creates the database (`server/data.db`) and the three sample users.
To start again with an empty app, stop the server, delete `server/data.db` and the
`server/uploads/` folder, and run `npm start` again.

### Default users

| Username | Password   | Role     | Department  |
|----------|------------|----------|-------------|
| `ahmed`  | `ahmed123` | Engineer | Exploration |
| `sara`   | `sara123`  | Engineer | Production  |
| `mona`   | `mona123`  | Manager  | Management  |

### Sample files

The [`sample-files/`](sample-files/) folder contains five one-page PDFs, one per document type,
for testing uploads. **All of their content is invented** — no real company data is used.

### Development mode

```bash
npm run dev
```

Runs the API on port 4000 (restarts on changes) and the React app on
**http://localhost:5173** (updates instantly on changes). Use port 5173 in this mode.

---

## Features

### Required

| # | Requirement | How it works |
|---|---|---|
| 1 | Login with two roles | Ready-made accounts; passwords are hashed with bcrypt; a JWT token identifies the user on every request |
| 2 | Upload a document | Engineers upload a PDF or image (max 10 MB) with title, department and document type |
| 3 | Statuses | Pending Approval, Approved, Rejected |
| 4 | Approve or reject | Managers approve or reject pending documents; a rejection requires a comment |
| 5 | Document list + search | Engineers see their own documents, Managers see all; search by title |
| 6 | Saved in a database | SQLite file — documents and statuses survive a restart |

### Bonus

- **Resubmission** — after a rejection, the Engineer sees the reason, uploads a corrected file and can add a note for the Manager.
- **History** — each document shows who did what and when (submitted, rejected, resubmitted, approved), including comments.
- **Filters** — by status and by department, combined with the search.
- **Preview** — PDFs and images are shown inside the page, without downloading.
- **Summary** — counts of pending, approved and rejected documents at the top; clicking a count filters the list.

### Security: checked on the server, not only hidden on screen

The screen hides buttons a user can't use, but **every rule is also enforced by the server**:

| Rule | Where it is enforced |
|---|---|
| Only Managers approve/reject | `requireRole('Manager')` on the approve and reject routes |
| Only Engineers upload/resubmit | `requireRole('Engineer')` on the upload and resubmit routes |
| Engineers only see their own documents | `WHERE owner_id = ?` in the list and status-count queries |
| Files and history are private to the owner and Managers | `canSee()` check — other users get "not found" |
| Rejection needs a comment; only pending documents can be decided | Validated in the route before the database is changed |
| Only PDF and image files up to 10 MB | Checked by the upload middleware |

---

## Technology and why

| Part | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Component-based UI I'm comfortable with; Vite gives a fast dev server and build |
| Backend | Node.js + Express | Same language (JavaScript) on both sides; small and easy to read |
| Database | SQLite (`better-sqlite3`) | A single file, no database server to install — the app runs with two commands |
| File uploads | `multer` | Saves uploaded files to `server/uploads/` with unique names |
| Authentication | JWT + bcrypt | Stateless login token carrying the user's role; passwords never stored in plain text |

---

## Project structure

```
GeoEnergy-Challenge/
├── package.json              scripts to install, build and run everything
├── sample-files/             invented test documents
├── server/
│   ├── src/
│   │   ├── index.js          creates the Express app, registers routes, serves the React build
│   │   ├── db.js             opens SQLite, creates tables, seeds the sample users
│   │   ├── constants.js      departments, document types, statuses, allowed file types
│   │   ├── upload.js         multer configuration (where and how files are saved)
│   │   ├── middleware/
│   │   │   └── checkAccess.js  requireAuth (valid token) and requireRole (Engineer/Manager)
│   │   └── routers/
│   │       ├── login.js      POST /api/auth/login
│   │       └── documents.js  list, status counts, upload, file, history, resubmit, approve, reject
│   ├── data.db               the database (created on first run, not in git)
│   └── uploads/              uploaded files (created on first run, not in git)
└── client/
    └── src/
        ├── App.jsx           routes and the logged-in layout
        ├── AuthContext.jsx   keeps the logged-in user and token
        ├── api.js            fetch wrapper that adds the token to each request
        ├── format.js         date formatting
        ├── pages/
        │   ├── LoginPage.jsx
        │   └── DocumentsPage.jsx    summary, filters, table and actions
        └── components/
            ├── SummaryCards.jsx     pending / approved / rejected counts
            ├── UploadForm.jsx       new document form
            ├── RejectDialog.jsx     rejection comment
            ├── ResubmitDialog.jsx   upload a corrected file
            ├── DocumentDetails.jsx  details, preview and history
            ├── FilePreview.jsx      PDF / image preview
            └── StatusBadge.jsx      coloured status label
```

---

## How it works

### A request from the page to the database

Example: Mona approves a document.

1. **React** — clicking *Approve* calls `api('/documents/5/approve', { method: 'POST' })`.
   `api.js` adds the header `Authorization: Bearer <token>`.
2. **Express** — `requireAuth` verifies the token's signature and puts the user
   (`{ id, username, role, department }`) on `req.user`.
3. **Role check** — `requireRole('Manager')` stops the request with *403* if the user is not a Manager.
4. **Route** — the approve route checks the document exists and is still pending, then runs
   `UPDATE documents SET status = 'Approved' ...` and inserts a row into `history`.
5. **Response** — the server returns the updated document as JSON; React reloads the list
   and the summary counts.

### Database tables

```
users       id, username, password_hash, role, department
documents   id, title, department, doc_type, file_name, file_path, mime_type,
            status, manager_comment, owner_id → users.id, created_at, updated_at
history     id, document_id → documents.id, user_id → users.id, action, comment, created_at
```

- `documents.file_name` is the original name shown to users; `file_path` is the unique name on disk.
- `history.action` is one of *Submitted*, *Approved*, *Rejected*, *Resubmitted*.
- Dates are stored in UTC and shown in the user's local time.

### API

All routes except login require `Authorization: Bearer <token>`.

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | anyone | Returns a token and the user |
| GET | `/api/options` | logged in | Departments, document types, statuses |
| GET | `/api/documents?search=&status=&department=` | logged in | List (Engineers: own only) |
| GET | `/api/documents/status-counts` | logged in | Number of documents per status (Engineers: own only) |
| POST | `/api/documents` | Engineer | Upload (multipart: `file`, `title`, `department`, `doc_type`) |
| GET | `/api/documents/:id/file` | owner or Manager | The file, shown inline |
| GET | `/api/documents/:id/history` | owner or Manager | Who did what and when |
| POST | `/api/documents/:id/resubmit` | owning Engineer | New file + optional `note` for a rejected document |
| POST | `/api/documents/:id/approve` | Manager | Approve a pending document |
| POST | `/api/documents/:id/reject` | Manager | Reject a pending document (`comment` required) |

---

## Assumptions

- **Department on upload** defaults to the Engineer's own department but can be changed,
  since a document may belong to another department (the brief asks the Engineer to fill it in).
- **Managers see the rejection comment** as well as the Engineer, labelled "Rejection reason".
- **Resubmission replaces the file.** The old file is deleted; the rejection reason and the
  resubmission note stay in the document's history.
- **Only Engineers upload** and **only Managers decide**; a Manager does not upload documents.
- **A decision is final** until the Engineer resubmits: an approved or rejected document can't be
  approved/rejected again.
- **Testing two users at once:** the login is shared by all tabs of the same browser.
  Use a normal window and a private window (or two browsers).
- **Accepted files:** PDF, PNG, JPEG, GIF and WebP, up to 10 MB.

## What I would improve next

- **Arabic and English interface** (the remaining bonus), including right-to-left layout.
- **Keep every version of a file** on resubmission instead of replacing it.
- **Automated tests** for the API routes (especially the role checks).
- **Notifications** — e.g. email the Manager when a document is submitted, and the Engineer when it is decided.
- **User management** — an admin page to add users and reset passwords, instead of fixed sample users.
- **Pagination** for the document list once there are many documents.
- **Production settings** — a secret `JWT_SECRET` from an environment variable (a development
  default is used now), HTTPS, and storing files in cloud storage.
