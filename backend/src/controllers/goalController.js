const { validationResult } = require('express-validator');
const Goal = require('../models/Goal');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get current goal
 * @route GET /api/goals/current
 */
const getCurrentGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.getCurrent(req.user.id);

  if (!goal) {
    return res.status(404).json({ message: 'No current goal found' });
  }

  res.json({ goal });
});

/**
 * Get goal for a specific date
 * @route GET /api/goals/date
 */
const getGoalForDate = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  const goal = await Goal.getForDate(req.user.id, date);

  if (!goal) {
    return res.status(404).json({ message: 'No goal found for the specified date' });
  }

  res.json({ goal });
});

/**
 * Get all goals
 * @route GET /api/goals
 */
const getAllGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.getAll(req.user.id);

  res.json({ goals });
});

/**
 * Create a new goal
 * @route POST /api/goals
 */
const createGoal = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    daily_calorie_target,
    protein_target_grams,
    carbs_target_grams,
    fat_target_grams,
    start_date,
    sync_id,
  } = req.body;

  // Create goal
  const goal = await Goal.create({
    user_id: req.user.id,
    daily_calorie_target,
    protein_target_grams,
    carbs_target_grams,
    fat_target_grams,
    start_date,
    sync_id,
  });

  res.status(201).json({
    message: 'Goal created',
    goal,
  });
});

/**
 * Update a goal
 * @route PUT /api/goals/:id
 */
const updateGoal = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  // Check if goal exists
  const existingGoal = await Goal.findById(id, req.user.id);
  if (!existingGoal) {
    return res.status(404).json({ message: 'Goal not found' });
  }

  // Update goal
  const updatedGoal = await Goal.update(id, req.user.id, req.body);

  if (!updatedGoal) {
    return res.status(500).json({ message: 'Failed to update goal' });
  }

  res.json({
    message: 'Goal updated',
    goal: updatedGoal,
  });
});

/**
 * Delete a goal
 * @route DELETE /api/goals/:id
 */
const deleteGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if goal exists
  const existingGoal = await Goal.findById(id, req.user.id);
  if (!existingGoal) {
    return res.status(404).json({ message: 'Goal not found' });
  }

  // Delete goal
  const success = await Goal.delete(id, req.user.id);

  if (!success) {
    return res.status(500).json({ message: 'Failed to delete goal' });
  }

  res.json({ message: 'Goal deleted' });
});

module.exports = {
  getCurrentGoal,
  getGoalForDate,
  getAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};