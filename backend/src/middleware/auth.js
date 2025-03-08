const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticate = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutrition_jwt_secret');

    // Add user data to request
    req.user = decoded;

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticate,
};