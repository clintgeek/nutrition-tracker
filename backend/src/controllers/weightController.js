const { validationResult } = require('express-validator');
const Weight = require('../models/Weight');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get weight goal
 * @route GET /api/weight/goal
 */
const getWeightGoal = asyncHandler(async (req, res) => {
  const goal = await Weight.getWeightGoal(req.user.id);

  if (!goal) {
    return res.status(404).json({ message: 'No weight goal found' });
  }

  res.json({ goal });
});

/**
 * Create or update weight goal
 * @route POST /api/weight/goal
 */
const saveWeightGoal = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    target_weight,
    start_weight,
    start_date,
    target_date,
    sync_id,
  } = req.body;

  // Create or update goal
  const goal = await Weight.saveWeightGoal({
    user_id: req.user.id,
    target_weight,
    start_weight,
    start_date,
    target_date,
    sync_id,
  });

  res.status(201).json({
    message: 'Weight goal saved',
    goal,
  });
});

/**
 * Get weight logs
 * @route GET /api/weight/logs
 */
const getWeightLogs = asyncHandler(async (req, res) => {
  const logs = await Weight.getWeightLogs(req.user.id);

  res.json({ logs });
});

/**
 * Add weight log
 * @route POST /api/weight/logs
 */
const addWeightLog = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    weight_value,
    log_date,
    notes,
    sync_id,
  } = req.body;

  // Add weight log
  const log = await Weight.addWeightLog({
    user_id: req.user.id,
    weight: weight_value,
    date: log_date,
    notes,
    sync_id,
  });

  res.status(201).json({
    message: 'Weight log added',
    log,
  });
});

/**
 * Delete weight log
 * @route DELETE /api/weight/logs/:id
 */
const deleteWeightLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if log exists and belongs to user
  const log = await Weight.getWeightLogById(id, req.user.id);
  if (!log) {
    return res.status(404).json({ message: 'Weight log not found' });
  }

  // Delete log
  await Weight.deleteWeightLog(id, req.user.id);

  res.json({ message: 'Weight log deleted' });
});

/**
 * Get latest weight log
 * @route GET /api/weight/logs/latest
 */
const getLatestWeightLog = asyncHandler(async (req, res) => {
  const log = await Weight.getLatestWeightLog(req.user.id);

  if (!log) {
    return res.status(404).json({ message: 'No weight logs found' });
  }

  res.json({ log });
});

/**
 * Get weight logs for date range
 * @route GET /api/weight/logs/range
 */
const getWeightLogsForDateRange = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  const logs = await Weight.getWeightLogsForDateRange(req.user.id, start_date, end_date);

  res.json({ logs });
});

module.exports = {
  getWeightGoal,
  saveWeightGoal,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  getLatestWeightLog,
  getWeightLogsForDateRange,
};