const express = require('express');
const router = express.Router();
const BloodPressure = require('../models/BloodPressure');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// Get all blood pressure logs for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    let bloodPressureLogs;
    const { start_date, end_date } = req.query;

    if (start_date && end_date) {
      // Get logs for date range
      bloodPressureLogs = await BloodPressure.getBloodPressureLogsForDateRange(
        req.user.id,
        start_date,
        end_date
      );
    } else {
      // Get all logs
      bloodPressureLogs = await BloodPressure.getBloodPressureLogs(req.user.id);
    }

    res.json(bloodPressureLogs);
  } catch (error) {
    console.error('Error fetching blood pressure logs:', error);
    res.status(500).json({ message: 'Error fetching blood pressure logs' });
  }
});

// Get latest blood pressure log
router.get('/latest', authenticate, async (req, res) => {
  try {
    const latestLog = await BloodPressure.getLatestBloodPressureLog(req.user.id);
    res.json({ log: latestLog });
  } catch (error) {
    console.error('Error fetching latest blood pressure log:', error);
    res.status(500).json({ message: 'Error fetching latest blood pressure log' });
  }
});

// Add a new blood pressure log
router.post('/', authenticate, async (req, res) => {
  try {
    const { systolic, diastolic, pulse, log_date, notes } = req.body;
    const bloodPressureLog = await BloodPressure.addBloodPressureLog({
      user_id: req.user.id,
      systolic,
      diastolic,
      pulse,
      log_date,
      notes
    });
    res.status(201).json(bloodPressureLog);
  } catch (error) {
    console.error('Error adding blood pressure log:', error);
    res.status(500).json({ message: 'Error adding blood pressure log' });
  }
});

// Update a blood pressure log
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { systolic, diastolic, pulse, log_date, notes } = req.body;
    const updatedLog = await BloodPressure.updateBloodPressureLog(
      parseInt(req.params.id),
      req.user.id,
      { systolic, diastolic, pulse, log_date, notes }
    );

    if (!updatedLog) {
      return res.status(404).json({ message: 'Blood pressure log not found' });
    }

    res.json(updatedLog);
  } catch (error) {
    console.error('Error updating blood pressure log:', error);
    res.status(500).json({ message: 'Error updating blood pressure log' });
  }
});

// Delete a blood pressure log
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const deleted = await BloodPressure.deleteBloodPressureLog(parseInt(req.params.id), req.user.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Blood pressure log not found' });
    }

    res.json({ message: 'Blood pressure log deleted successfully' });
  } catch (error) {
    console.error('Error deleting blood pressure log:', error);
    res.status(500).json({ message: 'Error deleting blood pressure log' });
  }
});

// Generate PDF report
router.get('/report', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let logs;

    if (startDate && endDate) {
      logs = await BloodPressure.getBloodPressureLogsForDateRange(req.user.id, startDate, endDate);
    } else {
      logs = await BloodPressure.getBloodPressureLogs(req.user.id);
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=blood-pressure-report.pdf');
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Blood Pressure Report', { align: 'center' });
    doc.moveDown();

    // Add date range if specified
    if (startDate && endDate) {
      doc.fontSize(12).text(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
      doc.moveDown();
    }

    // Add blood pressure logs
    logs.forEach(log => {
      doc.fontSize(12)
        .text(`Date: ${new Date(log.log_date).toLocaleDateString()}`)
        .text(`Systolic: ${log.systolic} mmHg`)
        .text(`Diastolic: ${log.diastolic} mmHg`)
        .text(`Pulse: ${log.pulse || 'N/A'} bpm`)
        .text(`Notes: ${log.notes || 'N/A'}`)
        .moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('Error generating blood pressure report:', error);
    res.status(500).json({ message: 'Error generating blood pressure report' });
  }
});

module.exports = router;