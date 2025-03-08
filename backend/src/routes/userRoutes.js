const express = require('express');
const { check } = require('express-validator');
const { getProfile, updateProfile, updatePassword } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/users/profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', getProfile);

/**
 * @route PUT /api/users/profile
 * @desc Update user profile
 * @access Private
 */
router.put(
  '/profile',
  [
    check('name', 'Name is required').not().isEmpty(),
  ],
  updateProfile
);

/**
 * @route PUT /api/users/password
 * @desc Update user password
 * @access Private
 */
router.put(
  '/password',
  [
    check('currentPassword', 'Current password is required').not().isEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ],
  updatePassword
);

module.exports = router;