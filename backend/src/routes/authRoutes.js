const express = require('express');
const { check } = require('express-validator');
const { register, login, getCurrentUser, refreshToken } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  register
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  login
);

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh token
 * @access Private
 */
router.post('/refresh-token', authenticate, refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side only)
 * @access Public
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;