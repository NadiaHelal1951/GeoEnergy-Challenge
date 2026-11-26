// Middleware that protects routes.
// requireAuth: the request must carry a valid login token.
// requireRole: the logged-in user must have a specific role (checked on the server,
//              so hiding a button in the UI is not the only protection).
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function requireAuth(req, res, next) {
  // The client sends: Authorization: Bearer <token>
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    // If the token is valid, its contents become req.user ({ id, username, role, department })
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Only a ${role} can do this` });
    }
    next();
  };
}
