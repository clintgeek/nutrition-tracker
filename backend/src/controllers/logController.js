const { validationResult } = require('express-validator');
const FoodLog = require('../models/FoodLog');
const FoodItem = require('../models/FoodItem');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get food logs for a specific date
 * @route GET /api/logs
 */
const getLogs = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  const logs = await FoodLog.getByDate(req.user.id, date);

  res.json({ logs });
});

/**
 * Get food logs for a date range
 * @route GET /api/logs/summary
 */
const getLogSummary = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ message: 'Start date and end date are required' });
  }

  const logs = await FoodLog.getByDateRange(req.user.id, start_date, end_date);

  // Group logs by date
  const logsByDate = logs.reduce((acc, log) => {
    const date = log.log_date.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {});

  // Calculate daily summaries
  const summaries = {};
  for (const date in logsByDate) {
    const dailyLogs = logsByDate[date];

    summaries[date] = {
      total_calories: dailyLogs.reduce((sum, log) => sum + (log.calories_per_serving * log.servings), 0),
      total_protein: dailyLogs.reduce((sum, log) => sum + (log.protein_grams * log.servings), 0),
      total_carbs: dailyLogs.reduce((sum, log) => sum + (log.carbs_grams * log.servings), 0),
      total_fat: dailyLogs.reduce((sum, log) => sum + (log.fat_grams * log.servings), 0),
      total_items: dailyLogs.length,
    };
  }

  res.json({
    logs_by_date: logsByDate,
    summaries,
  });
});

/**
 * Get daily summary
 * @route GET /api/logs/daily-summary
 */
const getDailySummary = asyncHandler(async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  const summary = await FoodLog.getDailySummary(req.user.id, date);

  res.json({ summary });
});

/**
 * Create a new food log
 * @route POST /api/logs
 */
const createLog = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { food_item_id, log_date, meal_type, servings, sync_id } = req.body;

  // Check if food item exists
  const foodItem = await FoodItem.findById(food_item_id);
  if (!foodItem) {
    return res.status(404).json({ message: 'Food item not found' });
  }

  // Create log
  const log = await FoodLog.create({
    user_id: req.user.id,
    food_item_id,
    log_date,
    meal_type,
    servings,
    sync_id,
  });

  // Get full log with food details
  const fullLog = await FoodLog.findById(log.id, req.user.id);

  res.status(201).json({
    message: 'Food log created',
    log: fullLog,
  });
});

/**
 * Update a food log
 * @route PUT /api/logs/:id
 */
const updateLog = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { meal_type, servings, log_date } = req.body;

  // Check if log exists
  const existingLog = await FoodLog.findById(id, req.user.id);
  if (!existingLog) {
    return res.status(404).json({ message: 'Food log not found' });
  }

  // Update log
  const updatedLog = await FoodLog.update(id, req.user.id, {
    meal_type,
    servings,
    log_date,
  });

  if (!updatedLog) {
    return res.status(500).json({ message: 'Failed to update food log' });
  }

  // Get full log with food details
  const fullLog = await FoodLog.findById(id, req.user.id);

  res.json({
    message: 'Food log updated',
    log: fullLog,
  });
});

/**
 * Delete a food log
 * @route DELETE /api/logs/:id
 */
const deleteLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if log exists
  const existingLog = await FoodLog.findById(id, req.user.id);
  if (!existingLog) {
    return res.status(404).json({ message: 'Food log not found' });
  }

  // Delete log
  const success = await FoodLog.delete(id, req.user.id);

  if (!success) {
    return res.status(500).json({ message: 'Failed to delete food log' });
  }

  res.json({ message: 'Food log deleted' });
});

module.exports = {
  getLogs,
  getLogSummary,
  getDailySummary,
  createLog,
  updateLog,
  deleteLog,
};