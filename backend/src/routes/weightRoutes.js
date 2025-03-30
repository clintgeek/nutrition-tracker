const express = require('express');
const router = express.Router();
const {
  getWeightGoal,
  saveWeightGoal,
  getWeightLogs,
  addWeightLog,
  deleteWeightLog,
  getLatestWeightLog,
  getWeightLogsForDateRange
} = require('../controllers/weightController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

// Weight goals routes
router.get('/goal', authenticate, getWeightGoal);
router.post('/goal', [
  authenticate,
  body('target_weight').isNumeric().withMessage('Target weight must be a number'),
  body('start_weight').isNumeric().withMessage('Start weight must be a number'),
  body('start_date').isISO8601().withMessage('Start date must be in ISO format'),
  body('target_date').optional().isISO8601().withMessage('Target date must be in ISO format'),
], saveWeightGoal);

// Weight logs routes
router.get('/logs', authenticate, getWeightLogs);
router.post('/logs', [
  authenticate,
  body('weight_value').isNumeric().withMessage('Weight must be a number'),
  body('log_date').isISO8601().withMessage('Log date must be in ISO format'),
], addWeightLog);
router.delete('/logs/:id', authenticate, deleteWeightLog);
router.get('/logs/latest', authenticate, getLatestWeightLog);
router.get('/logs/range', authenticate, getWeightLogsForDateRange);

module.exports = router;