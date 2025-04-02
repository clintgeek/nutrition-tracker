/**
 * @file Validation utility functions
 * @description Validators for common data types and middleware functions
 */

const moment = require('moment');
const logger = require('./logger');

/**
 * Check if a string is a valid date in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid date format
 */
function isValidDateFormat(dateString) {
  if (!dateString) return false;
  return moment(dateString, 'YYYY-MM-DD', true).isValid();
}

/**
 * Middleware to validate a single date field
 * @param {string} fieldName - Name of the field to validate
 * @param {string} location - Where to look for the field (body, query, params)
 * @returns {function} Express middleware
 */
function validateDate(fieldName, location = 'body') {
  return (req, res, next) => {
    const value = req[location][fieldName];

    if (value && !isValidDateFormat(value)) {
      return res.status(400).json({
        error: `Invalid date format for ${fieldName}. Use YYYY-MM-DD format.`
      });
    }

    next();
  };
}

/**
 * Middleware to validate a date range (startDate and endDate)
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 * @returns {void}
 */
function validateDateRange(req, res, next) {
  const { startDate, endDate } = req.body;

  // Start date is required
  if (!startDate) {
    return res.status(400).json({ error: 'Start date is required' });
  }

  // Validate start date format
  if (!isValidDateFormat(startDate)) {
    return res.status(400).json({
      error: 'Invalid start date format. Use YYYY-MM-DD format.'
    });
  }

  // Validate end date format if provided
  if (endDate && !isValidDateFormat(endDate)) {
    return res.status(400).json({
      error: 'Invalid end date format. Use YYYY-MM-DD format.'
    });
  }

  // Ensure end date is not before start date
  if (endDate && moment(endDate).isBefore(moment(startDate))) {
    return res.status(400).json({
      error: 'End date cannot be before start date'
    });
  }

  next();
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets requirements
 */
function isStrongPassword(password) {
  // At least 8 characters, containing at least one uppercase, one lowercase, and one number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

module.exports = {
  isValidDateFormat,
  validateDate,
  validateDateRange,
  isValidEmail,
  isStrongPassword
};