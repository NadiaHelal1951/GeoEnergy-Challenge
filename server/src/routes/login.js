// POST /api/auth/login — checks username + password and returns a token.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/checkLogin.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());

  // Same message for "no such user" and "wrong password", so we don't reveal which usernames exist.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Never send the password hash to the client.
  const publicUser = { id: user.id, username: user.username, role: user.role, department: user.department };
  const token = jwt.sign(publicUser, JWT_SECRET, { expiresIn: '8h' });

  res.json({ token, user: publicUser });
});

export default router;
