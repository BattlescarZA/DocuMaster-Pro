const { verifyToken } = require('../config/auth');

/**
 * JWT Authentication Middleware
 * Verifies the Bearer token and attaches user to request
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error.' });
  }
};

/**
 * Admin Role Middleware
 * Ensures the user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

/**
 * Editor or Admin Role Middleware
 * Ensures the user has editor or admin role
 */
const requireEditor = (req, res, next) => {
  if (!req.user || !['admin', 'editor'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access denied. Editor role required.' });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireEditor,
};
