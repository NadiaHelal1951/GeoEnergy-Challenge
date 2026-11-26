// Entry point: creates the Express app, registers routes, and starts listening.
import express from 'express';
import cors from 'cors';
import './db.js'; // opens the database and seeds users on first run
import authRoutes from './routes/auth.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // lets us read JSON bodies as req.body

app.use('/api/auth', authRoutes);

// Returns the currently logged-in user; handy for testing that the token works.
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
