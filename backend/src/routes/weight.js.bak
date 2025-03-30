const express = require('express');
const router = express.Router();
const Weight = require('../models/Weight');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// Get weight goal for the authenticated user
router.get('/goal', authenticate, async (req, res) => {
  try {
    const weightGoal = await Weight.getWeightGoal(req.user.id);
    res.json({ goal: weightGoal });
  } catch (error) {
    console.error('Error fetching weight goal:', error);
    res.status(500).json({ message: 'Error fetching weight goal' });
  }
});

// Save weight goal for the authenticated user
router.post('/goal', authenticate, async (req, res) => {
  try {
    const { target_weight, start_weight, start_date, target_date, sync_id } = req.body;
    const weightGoal = await Weight.saveWeightGoal({
      user_id: req.user.id,
      target_weight,
      start_weight,
      start_date,
      target_date,
      sync_id
    });
    res.status(201).json({ message: 'Weight goal saved successfully', goal: weightGoal });
  } catch (error) {
    console.error('Error saving weight goal:', error);
    res.status(500).json({ message: 'Error saving weight goal' });
  }
});

// Get all weight logs for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    let weightLogs;
    const { start_date, end_date } = req.query;

    if (start_date && end_date) {
      // Get logs for date range
      weightLogs = await Weight.getWeightLogsForDateRange(req.user.id, start_date, end_date);
    } else {
      // Get all logs
      weightLogs = await Weight.getWeightLogs(req.user.id);
    }

    res.json(weightLogs);
  } catch (error) {
    console.error('Error fetching weight logs:', error);
    res.status(500).json({ message: 'Error fetching weight logs' });
  }
});

// Get latest weight log
router.get('/latest', authenticate, async (req, res) => {
  try {
    const latestLog = await Weight.getLatestWeightLog(req.user.id);
    res.json({ log: latestLog });
  } catch (error) {
    console.error('Error fetching latest weight log:', error);
    res.status(500).json({ message: 'Error fetching latest weight log' });
  }
});

// Add a new weight log
router.post('/', authenticate, async (req, res) => {
  try {
    const { weight, date, notes } = req.body;
    const weightLog = await Weight.addWeightLog({
      user_id: req.user.id,
      weight,
      date,
      notes
    });
    res.status(201).json(weightLog);
  } catch (error) {
    console.error('Error adding weight log:', error);
    res.status(500).json({ message: 'Error adding weight log' });
  }
});

// Update a weight log
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { weight, date, notes } = req.body;
    const existingLog = await Weight.getWeightLogById(req.params.id, req.user.id);

    if (!existingLog) {
      return res.status(404).json({ message: 'Weight log not found' });
    }

    // Since the model doesn't have an update method, we'll delete and recreate
    await Weight.deleteWeightLog(req.params.id, req.user.id);
    const updatedLog = await Weight.addWeightLog({
      user_id: req.user.id,
      weight,
      date,
      notes
    });

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating weight log:', error);
    res.status(500).json({ message: 'Error updating weight log' });
  }
});

// Delete a weight log
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deleted = await Weight.deleteWeightLog(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Weight log not found' });
    }

    res.json({ message: 'Weight log deleted successfully' });
  } catch (error) {
    console.error('Error deleting weight log:', error);
    res.status(500).json({ message: 'Error deleting weight log' });
  }
});

// Generate PDF report
router.get('/report', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let weightLogs;

    if (startDate && endDate) {
      weightLogs = await Weight.getWeightLogsForDateRange(req.user.id, startDate, endDate);
    } else {
      weightLogs = await Weight.getWeightLogs(req.user.id);
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=weight-report.pdf');
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Weight Tracking Report', { align: 'center' });
    doc.moveDown();

    // Add date range if specified
    if (startDate && endDate) {
      doc.fontSize(12).text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
      doc.moveDown();
    }

    // Add weight logs
    weightLogs.forEach(log => {
      doc.fontSize(12)
        .text(`Date: ${new Date(log.log_date || log.date).toLocaleDateString()}`)
        .text(`Weight: ${log.weight_value || log.weight} kg`)
        .text(`Notes: ${log.notes || 'N/A'}`)
        .moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error generating weight report:', error);
    res.status(500).json({ message: 'Error generating weight report' });
  }
});

module.exports = router;