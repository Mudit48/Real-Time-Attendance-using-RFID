const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Authenticate JWT token from Authorization header
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Require a specific role ('student' or 'teacher')
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden. Requires ${role} role.` 
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
