const express = require('express');
const { check } = require('express-validator');
const {
  getLogs,
  getLogSummary,
  getDailySummary,
  createLog,
  updateLog,
  deleteLog,
  getRecentByMealType,
} = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

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
 * @route GET /api/logs/recent/:mealType
 * @desc Get recent food items by meal type
 * @access Private
 */
router.get('/recent/:mealType', getRecentByMealType);

/**
 * @route GET /api/logs/recent
 * @desc Get recent food items
 * @access Private
 */
router.get('/recent', async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    // Get recent logs with food name
    const logs = await db.query(
      `SELECT l.*, f.name as food_name
       FROM food_logs l
       LEFT JOIN food_items f ON l.food_item_id = f.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json(logs.rows);
  } catch (error) {
    console.error('Error getting recent logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route POST /api/logs
 * @desc Create a new food log
 * @access Private
 */
router.post(
  '/',
  [
    check('food_item_id', 'Food item ID is required')
      .if((value, { req }) => !req.body.food_item)
      .isNumeric(),
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