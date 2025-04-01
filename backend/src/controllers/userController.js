const { validationResult } = require('express-validator');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Get user profile
 * @route GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        weight: user.weight,
        height: user.height,
        gender: user.gender,
        birthdate: user.birthdate,
        activity_level: user.activity_level,
        weight_goal: user.weight_goal,
        profile_picture: user.profile_picture,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name,
      weight,
      height,
      gender,
      birthdate,
      activity_level,
      weight_goal,
      profile_picture
    } = req.body;

    // Update user with all provided fields
    const updatedUser = await User.update(req.user.id, {
      name,
      weight,
      height,
      gender,
      birthdate,
      activity_level,
      weight_goal,
      profile_picture
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user password
 * @route PUT /api/users/password
 */
const updatePassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await User.comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    const success = await User.updatePassword(req.user.id, newPassword);

    if (!success) {
      return res.status(500).json({ message: 'Failed to update password' });
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
};