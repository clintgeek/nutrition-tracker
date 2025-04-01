const express = require('express');
const router = express.Router();
const BloodPressure = require('../models/BloodPressure');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const { format, parseISO, subMonths, subDays, startOfWeek, endOfWeek, differenceInWeeks, addWeeks } = require('date-fns');

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
    const { start_date, end_date, time_span } = req.query;
    let logs;
    let reportTitle = 'Blood Pressure Report';
    let dateRange = '';

    if (start_date && end_date) {
      logs = await BloodPressure.getBloodPressureLogsForDateRange(req.user.id, start_date, end_date);
      dateRange = `${format(new Date(start_date), 'MMM d, yyyy')} - ${format(new Date(end_date), 'MMM d, yyyy')}`;

      // Set report title based on time span
      if (time_span) {
        reportTitle = `${time_span} Blood Pressure Report`;
      }
    } else {
      logs = await BloodPressure.getBloodPressureLogs(req.user.id);
      dateRange = 'All Data';
      reportTitle = 'Blood Pressure Report';
    }

    // Get user information for the report
    const user = await User.findById(req.user.id);

    // Sort logs by date (oldest first for proper charting)
    logs.sort((a, b) => new Date(a.log_date) - new Date(b.log_date));

    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: reportTitle,
        Author: 'Nutrition Tracker App',
        Subject: 'Blood Pressure Monitoring',
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=blood-pressure-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    doc.pipe(res);

    // Helper function to assess blood pressure category
    const getBPCategory = (systolic, diastolic) => {
      if (systolic < 120 && diastolic < 80) return { category: 'Normal', color: '#4CAF50' };
      if ((systolic >= 120 && systolic <= 129) && diastolic < 80) return { category: 'Elevated', color: '#FFC107' };
      if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return { category: 'Stage 1', color: '#FF9800' };
      if (systolic >= 140 || diastolic >= 90) return { category: 'Stage 2', color: '#F44336' };
      if (systolic > 180 || diastolic > 120) return { category: 'Crisis', color: '#B71C1C' };
      return { category: 'Unknown', color: '#9E9E9E' };
    };

    // Helper function to format date
    const formatDate = (dateString) => {
      try {
        return format(new Date(dateString), 'MMM d, yyyy');
      } catch (e) {
        return dateString;
      }
    };

    // Determine if we should group by week (for 6M, 1Y, or ALL)
    const isLongTermReport = time_span === '6M' || time_span === '1Y' || time_span === 'ALL';

    // Group readings by category
    const groupReadingsByCategory = (logs) => {
      const categories = {
        'Normal': 0,
        'Elevated': 0,
        'Stage 1': 0,
        'Stage 2': 0,
        'Crisis': 0
      };

      logs.forEach(log => {
        const category = getBPCategory(log.systolic, log.diastolic).category;
        categories[category]++;
      });

      return categories;
    };

    // Group readings by week for long-term reports
    const groupByWeek = (logs) => {
      if (!logs || logs.length === 0) return [];

      const weeklyLogs = [];
      const startDate = new Date(logs[0].log_date);
      const endDate = new Date(logs[logs.length - 1].log_date);
      const totalWeeks = Math.max(1, differenceInWeeks(endDate, startDate) + 1);

      // Initialize weekly buckets
      for (let i = 0; i < totalWeeks; i++) {
        const weekStart = startOfWeek(addWeeks(startDate, i));
        const weekEnd = endOfWeek(addWeeks(startDate, i));
        weeklyLogs.push({
          weekStart,
          weekEnd,
          logs: [],
          systolicSum: 0,
          diastolicSum: 0,
          systolicMin: Infinity,
          systolicMax: -Infinity,
          diastolicMin: Infinity,
          diastolicMax: -Infinity,
          count: 0
        });
      }

      // Assign logs to weeks
      logs.forEach(log => {
        const logDate = new Date(log.log_date);
        const weekIndex = differenceInWeeks(logDate, startDate);

        if (weekIndex >= 0 && weekIndex < weeklyLogs.length) {
          const week = weeklyLogs[weekIndex];
          week.logs.push(log);
          week.systolicSum += log.systolic;
          week.diastolicSum += log.diastolic;
          week.systolicMin = Math.min(week.systolicMin, log.systolic);
          week.systolicMax = Math.max(week.systolicMax, log.systolic);
          week.diastolicMin = Math.min(week.diastolicMin, log.diastolic);
          week.diastolicMax = Math.max(week.diastolicMax, log.diastolic);
          week.count++;
        }
      });

      // Calculate averages and remove empty weeks
      return weeklyLogs.filter(week => week.count > 0).map(week => ({
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        avgSystolic: Math.round(week.systolicSum / week.count),
        avgDiastolic: Math.round(week.diastolicSum / week.count),
        systolicRange: `${week.systolicMin} - ${week.systolicMax}`,
        diastolicRange: `${week.diastolicMin} - ${week.diastolicMax}`,
        count: week.count,
        category: getBPCategory(
          Math.round(week.systolicSum / week.count),
          Math.round(week.diastolicSum / week.count)
        ).category
      }));
    };

    // Group data based on report timeframe
    const groupedData = isLongTermReport ? groupByWeek(logs) : logs;

    // Calculate category counts for summary
    const categories = groupReadingsByCategory(logs);

    // ===== Start building the PDF report =====

    // Add logo circle with BP icon
    doc.save()
      .roundedRect(50, 40, 30, 30, 15)
      .fill('#0D6EFD');

    doc.fill('white')
      .fontSize(16)
      .text('BP', 57, 50);

    // Add report title and date range
    doc.restore()
      .fontSize(18)
      .text(reportTitle, 90, 40, { continued: true })
      .fontSize(12)
      .fill('#666')
      .text(`\n${dateRange}`, { align: 'left' });

    // Add user info on the right side
    if (user) {
      doc.fontSize(14)
        .fill('#000')
        .text(user.name || 'User', 400, 40, { align: 'right' })
        .fontSize(10)
        .fill('#666');

      if (user.birthdate) {
        const birthdate = new Date(user.birthdate);
        const age = Math.floor((new Date() - birthdate) / (365.25 * 24 * 60 * 60 * 1000));
        doc.text(`Born ${format(birthdate, 'MMM d, yyyy')} (${age} yr)`, { align: 'right' });
      }

      if (user.gender) {
        doc.text(`${user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}`, { align: 'right' });
      }
    }

    // Add disclaimer
    doc.fontSize(8)
      .fill('#666')
      .text('Based on data from the American Heart Association. Health-related data is not intended to be used for medical purposes, nor is it intended to diagnose, cure or prevent any disease or condition.', 50, 80, { width: 500 });

    // Add summary section
    doc.moveDown(2)
      .fontSize(14)
      .fill('#000')
      .text('Summary', 50, 110);

    // Create category summary boxes
    const boxWidth = 100;
    const boxSpacing = 10;
    const categoryKeys = Object.keys(categories).filter(cat => categories[cat] > 0);

    categoryKeys.forEach((category, index) => {
      const x = 50 + (boxWidth + boxSpacing) * index;

      // Get color based on category
      let color;
      switch(category) {
        case 'Normal': color = '#4CAF50'; break;
        case 'Elevated': color = '#FFC107'; break;
        case 'Stage 1': color = '#FF9800'; break;
        case 'Stage 2': color = '#F44336'; break;
        case 'Crisis': color = '#B71C1C'; break;
        default: color = '#9E9E9E';
      }

      doc.roundedRect(x, 130, boxWidth, 60, 5)
        .fillAndStroke('#f8f9fa', '#e9ecef');

      doc.fontSize(18)
        .fill('#000')
        .text(categories[category], x + 10, 140);

      doc.fontSize(14)
        .text('Days', x + 10, 160);

      doc.fontSize(12)
        .fill(color)
        .text(category, x + 10, 180);
    });

    // Move down for chart section
    doc.moveDown(5)
      .fontSize(14)
      .fill('#000')
      .text('Blood Pressure Readings', 50, 210);

    // Create a simple chart visualization
    const chartHeight = 200;
    const chartWidth = 500;
    const chartTop = 230;
    const chartBottom = chartTop + chartHeight;

    // Find min and max for y-axis scaling
    let minDiastolic = Math.min(...logs.map(log => log.diastolic));
    let maxSystolic = Math.max(...logs.map(log => log.systolic));

    // Ensure a reasonable range that includes normal BP thresholds
    minDiastolic = Math.min(minDiastolic, 60);
    maxSystolic = Math.max(maxSystolic, 160);

    // Add some padding
    minDiastolic = Math.max(40, Math.floor(minDiastolic * 0.9));
    maxSystolic = Math.min(220, Math.ceil(maxSystolic * 1.1));

    const yRange = maxSystolic - minDiastolic;

    // Draw y-axis grid lines and labels
    for (let value = 60; value <= 200; value += 20) {
      const y = chartBottom - ((value - minDiastolic) / yRange) * chartHeight;

      // Draw grid line
      doc.strokeColor('#e9ecef')
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();

      // Add label
      doc.fillColor('#666')
        .fontSize(8)
        .text(value.toString(), 30, y - 4);
    }

    // Y-axis label
    doc.save()
      .rotate(-90, { origin: [20, 330] })
      .fontSize(10)
      .fill('#666')
      .text('Systolic / Diastolic', 0, 330)
      .restore();

    // Draw the BP data
    if (isLongTermReport) {
      // For long-term reports, draw weekly summaries
      const pointCount = groupedData.length;
      const pointSpacing = Math.min(15, chartWidth / (pointCount + 1));

      groupedData.forEach((week, i) => {
        const x = 50 + ((i + 1) * pointSpacing);

        // Draw date below x-axis if it's a key point (first of month)
        if (i % 4 === 0 || i === 0 || i === pointCount - 1) {
          doc.fontSize(8)
            .fill('#666')
            .text(format(week.weekStart, 'MMM'), x - 10, chartBottom + 10, { width: 20, align: 'center' });
        }

        // Draw systolic point and range
        const systolicY = chartBottom - ((week.avgSystolic - minDiastolic) / yRange) * chartHeight;

        // Parse min and max values from range
        const [sysMin, sysMax] = week.systolicRange.split(' - ').map(Number);

        // Draw systolic range
        doc.opacity(0.3)
          .fill('#dc3545');

        const rangeTop = chartBottom - ((sysMax - minDiastolic) / yRange) * chartHeight;
        const rangeBottom = chartBottom - ((sysMin - minDiastolic) / yRange) * chartHeight;
        doc.rect(x - 5, rangeTop, 10, rangeBottom - rangeTop).fill();

        // Reset opacity
        doc.opacity(1);

        // Draw systolic point
        doc.circle(x, systolicY, 3).fill('#dc3545');

        // Draw diastolic point and range
        const diastolicY = chartBottom - ((week.avgDiastolic - minDiastolic) / yRange) * chartHeight;

        // Parse min and max values from range
        const [diaMin, diaMax] = week.diastolicRange.split(' - ').map(Number);

        // Draw diastolic range
        doc.opacity(0.3)
          .fill('#0D6EFD');

        const diaRangeTop = chartBottom - ((diaMax - minDiastolic) / yRange) * chartHeight;
        const diaRangeBottom = chartBottom - ((diaMin - minDiastolic) / yRange) * chartHeight;
        doc.rect(x - 5, diaRangeTop, 10, diaRangeBottom - diaRangeTop).fill();

        // Reset opacity
        doc.opacity(1);

        // Draw diastolic point
        doc.circle(x, diastolicY, 3).fill('#0D6EFD');
      });
    } else {
      // For shorter reports, plot each individual reading
      const pointCount = logs.length;
      const pointSpacing = Math.min(15, chartWidth / (pointCount + 1));

      logs.forEach((log, i) => {
        const x = 50 + ((i + 1) * pointSpacing);

        // Draw date below x-axis if it's a key point
        if (i % 4 === 0 || i === 0 || i === pointCount - 1) {
          doc.fontSize(8)
            .fill('#666')
            .text(format(new Date(log.log_date), 'MMM d'), x - 12, chartBottom + 10, { width: 24, align: 'center' });
        }

        // Draw systolic point
        const systolicY = chartBottom - ((log.systolic - minDiastolic) / yRange) * chartHeight;
        doc.circle(x, systolicY, 3).fill('#dc3545');

        // Draw diastolic point
        const diastolicY = chartBottom - ((log.diastolic - minDiastolic) / yRange) * chartHeight;
        doc.circle(x, diastolicY, 3).fill('#0D6EFD');
      });
    }

    // Add chart legend
    doc.rect(50, chartBottom + 30, 10, 10).fill('#dc3545');
    doc.fontSize(10)
      .fill('#000')
      .text('Systolic', 65, chartBottom + 30);

    doc.rect(120, chartBottom + 30, 10, 10).fill('#0D6EFD');
    doc.text('Diastolic', 135, chartBottom + 30);

    // Add category legend
    const categories_x = 300;
    doc.circle(categories_x, chartBottom + 30, 5).fill('#4CAF50');
    doc.text('Normal', categories_x + 15, chartBottom + 27);

    doc.circle(categories_x + 80, chartBottom + 30, 5).fill('#FFC107');
    doc.text('Elevated', categories_x + 95, chartBottom + 27);

    doc.circle(categories_x, chartBottom + 45, 5).fill('#FF9800');
    doc.text('Stage 1', categories_x + 15, chartBottom + 42);

    doc.circle(categories_x + 80, chartBottom + 45, 5).fill('#F44336');
    doc.text('Stage 2', categories_x + 95, chartBottom + 42);

    // Detailed readings section
    doc.moveDown(5)
      .fontSize(14)
      .fill('#000')
      .text('Readings' + (isLongTermReport ? ' (Weekly Summary)' : '') + ` (${isLongTermReport ? groupedData.length : logs.length})`, 50, 480);

    // Create table headers
    const tableTop = 500;
    doc.fontSize(10)
      .fill('#666');

    if (isLongTermReport) {
      // Headers for weekly summaries
      doc.text('Week', 50, tableTop);
      doc.text('Systolic Range', 150, tableTop);
      doc.text('Diastolic Range', 250, tableTop);
      doc.text('Readings', 350, tableTop);

      // Underline
      doc.strokeColor('#e9ecef')
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table rows
      let y = tableTop + 25;

      groupedData.forEach((week, i) => {
        // Handle pagination
        if (y > 700) {
          doc.addPage();

          // Add continued header
          doc.fontSize(16)
            .fill('#0D6EFD')
            .text(reportTitle, 50, 40)
            .fill('#666')
            .fontSize(12)
            .text(`Blood Pressure Readings (Continued)`, 50, 60);

          // Reset y position
          y = 80;

          // Add table headers again
          doc.fontSize(10)
            .fill('#666')
            .text('Week', 50, y);
          doc.text('Systolic Range', 150, y);
          doc.text('Diastolic Range', 250, y);
          doc.text('Readings', 350, y);

          // Underline
          doc.strokeColor('#e9ecef')
            .moveTo(50, y + 15)
            .lineTo(550, y + 15)
            .stroke();

          y += 25;
        }

        // Zebra striping
        if (i % 2 === 0) {
          doc.rect(50, y - 5, 500, 20).fill('#f8f9fa');
        }

        doc.fill('#000')
          .text(`${format(week.weekStart, 'MMM d')} - ${format(week.weekEnd, 'MMM d, yyyy')}`, 50, y);
        doc.text(week.systolicRange, 150, y);
        doc.text(week.diastolicRange, 250, y);
        doc.text(week.count.toString(), 350, y);

        // Add BP category with appropriate color
        let color;
        switch(week.category) {
          case 'Normal': color = '#4CAF50'; break;
          case 'Elevated': color = '#FFC107'; break;
          case 'Stage 1': color = '#FF9800'; break;
          case 'Stage 2': color = '#F44336'; break;
          case 'Crisis': color = '#B71C1C'; break;
          default: color = '#9E9E9E';
        }

        doc.fill(color)
          .text(week.category, 400, y);

        y += 20;
      });
    } else {
      // Headers for daily readings
      doc.text('Date', 50, tableTop);
      doc.text('Systolic', 150, tableTop);
      doc.text('Diastolic', 230, tableTop);
      doc.text('Pulse', 300, tableTop);
      doc.text('Category', 350, tableTop);

      // Underline
      doc.strokeColor('#e9ecef')
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table rows
      let y = tableTop + 25;

      logs.forEach((log, i) => {
        // Handle pagination
        if (y > 700) {
          doc.addPage();

          // Add continued header
          doc.fontSize(16)
            .fill('#0D6EFD')
            .text(reportTitle, 50, 40)
            .fill('#666')
            .fontSize(12)
            .text(`Blood Pressure Readings (Continued)`, 50, 60);

          // Reset y position
          y = 80;

          // Add table headers again
          doc.fontSize(10)
            .fill('#666')
            .text('Date', 50, y);
          doc.text('Systolic', 150, y);
          doc.text('Diastolic', 230, y);
          doc.text('Pulse', 300, y);
          doc.text('Category', 350, y);

          // Underline
          doc.strokeColor('#e9ecef')
            .moveTo(50, y + 15)
            .lineTo(550, y + 15)
            .stroke();

          y += 25;
        }

        // Zebra striping
        if (i % 2 === 0) {
          doc.rect(50, y - 5, 500, 20).fill('#f8f9fa');
        }

        const category = getBPCategory(log.systolic, log.diastolic);

        doc.fill('#000')
          .text(formatDate(log.log_date), 50, y)
          .text(log.systolic.toString(), 150, y)
          .text(log.diastolic.toString(), 230, y)
          .text(log.pulse ? log.pulse.toString() : '--', 300, y);

        doc.fill(category.color)
          .text(category.category, 350, y);

        y += 20;
      });
    }

    // Add page number and footer
    const pageCount = doc.bufferedPageCount;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Add footer with page number
      doc.fontSize(8)
        .fill('#666')
        .text(`Page ${i + 1} of ${pageCount}`, 50, 780, { align: 'right' });
    }

    // Finalize the PDF and end the response
    doc.end();
  } catch (error) {
    console.error('Error generating blood pressure report:', error);
    res.status(500).json({ message: 'Error generating blood pressure report' });
  }
});

module.exports = router;