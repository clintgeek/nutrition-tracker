const express = require('express');
const { check } = require('express-validator');
const {
  getCurrentGoal,
  getGoalForDate,
  getAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} = require('../controllers/goalController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/goals/current
 * @desc Get current goal
 * @access Private
 */
router.get('/current', getCurrentGoal);

/**
 * @route GET /api/goals/date
 * @desc Get goal for a specific date
 * @access Private
 */
router.get('/date', getGoalForDate);

/**
 * @route GET /api/goals
 * @desc Get all goals
 * @access Private
 */
router.get('/', getAllGoals);

/**
 * @route POST /api/goals
 * @desc Create a new goal
 * @access Private
 */
router.post(
  '/',
  [
    check('daily_calorie_target', 'Daily calorie target is required').isNumeric(),
    check('protein_target_grams', 'Protein target must be a number').optional().isNumeric(),
    check('carbs_target_grams', 'Carbs target must be a number').optional().isNumeric(),
    check('fat_target_grams', 'Fat target must be a number').optional().isNumeric(),
    check('start_date', 'Start date must be a valid date').optional().isDate(),
  ],
  createGoal
);

/**
 * @route PUT /api/goals/:id
 * @desc Update a goal
 * @access Private
 */
router.put(
  '/:id',
  [
    check('daily_calorie_target', 'Daily calorie target is required').isNumeric(),
    check('protein_target_grams', 'Protein target must be a number').optional().isNumeric(),
    check('carbs_target_grams', 'Carbs target must be a number').optional().isNumeric(),
    check('fat_target_grams', 'Fat target must be a number').optional().isNumeric(),
    check('start_date', 'Start date must be a valid date').optional().isDate(),
  ],
  updateGoal
);

/**
 * @route DELETE /api/goals/:id
 * @desc Delete a goal
 * @access Private
 */
router.delete('/:id', deleteGoal);

module.exports = router;