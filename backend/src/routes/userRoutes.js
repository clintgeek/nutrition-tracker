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
    check('weight').optional().isNumeric().withMessage('Weight must be a number'),
    check('height').optional().isNumeric().withMessage('Height must be a number'),
    check('gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
    check('birthdate').optional().isDate().withMessage('Birthdate must be a valid date'),
    check('activity_level').optional().isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).withMessage('Invalid activity level'),
    check('weight_goal').optional().isIn(['lose', 'maintain', 'gain']).withMessage('Invalid weight goal'),
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