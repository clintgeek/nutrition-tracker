const express = require('express');
const { check } = require('express-validator');
const {
  getWeightGoal,
  saveWeightGoal,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  getLatestWeightLog,
  getWeightLogsForDateRange,
} = require('../controllers/weightController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/weight/goal
 * @desc Get weight goal
 * @access Private
 */
router.get('/goal', getWeightGoal);

/**
 * @route POST /api/weight/goal
 * @desc Create or update weight goal
 * @access Private
 */
router.post(
  '/goal',
  [
    check('target_weight', 'Target weight is required').isNumeric(),
    check('start_weight', 'Start weight is required').isNumeric(),
    check('start_date', 'Start date must be a valid date').isISO8601().toDate(),
    check('target_date', 'Target date must be a valid date').optional().isISO8601().toDate(),
  ],
  saveWeightGoal
);

/**
 * @route GET /api/weight/logs
 * @desc Get all weight logs
 * @access Private
 */
router.get('/logs', getWeightLogs);

/**
 * @route GET /api/weight/logs/latest
 * @desc Get latest weight log
 * @access Private
 */
router.get('/logs/latest', getLatestWeightLog);

/**
 * @route GET /api/weight/logs/range
 * @desc Get weight logs for a date range
 * @access Private
 */
router.get('/logs/range', getWeightLogsForDateRange);

/**
 * @route POST /api/weight/logs
 * @desc Add a weight log
 * @access Private
 */
router.post(
  '/logs',
  [
    check('weight_value', 'Weight is required').isNumeric(),
    check('log_date', 'Date must be a valid date').isISO8601().toDate(),
    check('notes', 'Notes must be a string').optional().isString(),
  ],
  addWeightLog
);

/**
 * @route DELETE /api/weight/logs/:id
 * @desc Delete a weight log
 * @access Private
 */
router.delete('/logs/:id', deleteWeightLog);

module.exports = router;