const express = require('express');
const { check } = require('express-validator');
const {
  getLogs,
  getLogSummary,
  getDailySummary,
  createLog,
  updateLog,
  deleteLog,
} = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/logs
 * @desc Get food logs for a specific date
 * @access Private
 */
router.get('/', getLogs);

/**
 * @route GET /api/logs/summary
 * @desc Get food logs for a date range
 * @access Private
 */
router.get('/summary', getLogSummary);

/**
 * @route GET /api/logs/daily-summary
 * @desc Get daily summary
 * @access Private
 */
router.get('/daily-summary', getDailySummary);

/**
 * @route POST /api/logs
 * @desc Create a new food log
 * @access Private
 */
router.post(
  '/',
  [
    check('food_item_id', 'Food item ID is required').isNumeric(),
    check('log_date', 'Log date is required').isDate(),
    check('meal_type', 'Meal type is required').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
    check('servings', 'Servings must be a positive number').isFloat({ min: 0.1 }),
  ],
  createLog
);

/**
 * @route PUT /api/logs/:id
 * @desc Update a food log
 * @access Private
 */
router.put(
  '/:id',
  [
    check('meal_type', 'Meal type is required').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
    check('servings', 'Servings must be a positive number').isFloat({ min: 0.1 }),
    check('log_date', 'Log date is required').isDate(),
  ],
  updateLog
);

/**
 * @route DELETE /api/logs/:id
 * @desc Delete a food log
 * @access Private
 */
router.delete('/:id', deleteLog);

module.exports = router;