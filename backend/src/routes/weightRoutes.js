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
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Weight = require('../models/Weight');
const { format, parseISO, subMonths, subDays, startOfWeek, endOfWeek, differenceInWeeks, addWeeks } = require('date-fns');

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

// Generate PDF report
router.get('/report', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, time_span } = req.query;
    let logs;
    let reportTitle = 'Weight Progress Report';
    let dateRange = '';

    if (start_date && end_date) {
      logs = await Weight.getWeightLogsForDateRange(req.user.id, start_date, end_date);
      dateRange = `${format(new Date(start_date), 'MMM d, yyyy')} - ${format(new Date(end_date), 'MMM d, yyyy')}`;

      // Set report title based on time span
      if (time_span) {
        reportTitle = `${time_span} Weight Progress Report`;
      }
    } else {
      logs = await Weight.getWeightLogs(req.user.id);
      dateRange = 'All Data';
    }

    // Get user information for the report
    const user = await User.findById(req.user.id);

    // Get weight goal
    const goal = await Weight.getWeightGoal(req.user.id);

    // Sort logs by date (oldest first for proper charting)
    logs.sort((a, b) => new Date(a.log_date || a.date) - new Date(b.log_date || b.date));

    // Create a new PDF document with specific settings to avoid vertical text
    const doc = new PDFDocument({
      size: 'letter', // Using letter size instead of A4
      margin: 50,
      layout: 'portrait',
      info: {
        Title: reportTitle,
        Author: 'Nutrition Tracker App',
        Subject: 'Weight Monitoring',
        Producer: 'Nutrition Tracker App',
        Creator: 'Nutrition Tracker App'
      },
      displayMode: 'fullpage'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=weight-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    doc.pipe(res);

    // Helper function to format date
    const formatDate = (dateString) => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          return 'Invalid Date';
        }
        return format(date, 'MMM d, yyyy');
      } catch (e) {
        console.error(`Error formatting date: ${dateString}`, e);
        return 'Invalid Date';
      }
    };

    // Determine if we should group by week (for 6M, 1Y, or ALL)
    const isLongTermReport = time_span === '1Y' || time_span === 'year' || time_span === 'goal' || time_span === 'Goal';

    // Group readings by week for long-term reports
    const groupByWeek = (logs) => {
      if (!logs || logs.length === 0) return [];

      try {
        // Find valid start and end dates from logs
        const validLogs = logs.filter(log => {
          const logDate = new Date(log.log_date || log.date);
          return !isNaN(logDate.getTime());
        });

        if (validLogs.length === 0) return [];

        // Sort logs by date
        validLogs.sort((a, b) => {
          const dateA = new Date(a.log_date || a.date);
          const dateB = new Date(b.log_date || b.date);
          return dateA - dateB;
        });

        const startDate = new Date(validLogs[0].log_date || validLogs[0].date);
        const endDate = new Date(validLogs[validLogs.length - 1].log_date || validLogs[validLogs.length - 1].date);
        const totalWeeks = Math.max(1, differenceInWeeks(endDate, startDate) + 1);

        // Initialize weekly buckets
        const weeklyLogs = [];
        for (let i = 0; i < totalWeeks; i++) {
          const weekStart = startOfWeek(addWeeks(startDate, i));
          const weekEnd = endOfWeek(addWeeks(startDate, i));
          weeklyLogs.push({
            weekStart,
            weekEnd,
            logs: [],
            weightSum: 0,
            weightMin: Infinity,
            weightMax: -Infinity,
            count: 0
          });
        }

        // Assign logs to weeks
        validLogs.forEach(log => {
          try {
            const logDate = new Date(log.log_date || log.date);
            if (isNaN(logDate.getTime())) return; // Skip invalid dates

            const weekIndex = differenceInWeeks(logDate, startDate);
            if (weekIndex < 0 || weekIndex >= weeklyLogs.length) return; // Skip if week index is out of range

            const weightValue = parseFloat(log.weight_value || log.weight);
            if (isNaN(weightValue)) return; // Skip invalid weights

            const week = weeklyLogs[weekIndex];
            week.logs.push(log);
            week.weightSum += weightValue;
            week.weightMin = Math.min(week.weightMin, weightValue);
            week.weightMax = Math.max(week.weightMax, weightValue);
            week.count++;
          } catch (e) {
            console.error("Error assigning log to week:", e);
            // Continue to next log
          }
        });

        // Calculate averages and remove empty weeks
        return weeklyLogs.filter(week => week.count > 0).map(week => ({
          weekStart: week.weekStart,
          weekEnd: week.weekEnd,
          avgWeight: (week.weightSum / week.count).toFixed(1),
          weightRange: week.weightMin === Infinity ? 'N/A' :
                      `${week.weightMin.toFixed(1)} - ${week.weightMax.toFixed(1)}`,
          count: week.count
        }));
      } catch (e) {
        console.error("Error grouping logs by week:", e);
        return [];
      }
    };

    // Group data based on report timeframe
    const groupedData = isLongTermReport ? groupByWeek(logs) : logs;

    // Calculate statistics
    const calculateStats = (logs) => {
      if (!logs || logs.length === 0) return null;

      try {
        // Filter out logs with invalid weights
        const validLogs = logs.filter(log => {
          const weightValue = parseFloat(log.weight_value || log.weight);
          return !isNaN(weightValue);
        });

        if (validLogs.length === 0) {
          return {
            start: '0.0',
            current: '0.0',
            change: '0.0',
            min: '0.0',
            max: '0.0',
            avg: '0.0'
          };
        }

        // Sort logs by date
        validLogs.sort((a, b) => {
          const dateA = new Date(a.log_date || a.date);
          const dateB = new Date(b.log_date || b.date);
          return dateA - dateB;
        });

        const weights = validLogs.map(log => parseFloat(log.weight_value || log.weight));
        return {
          start: weights[0].toFixed(1),
          current: weights[weights.length - 1].toFixed(1),
          change: (weights[weights.length - 1] - weights[0]).toFixed(1),
          min: Math.min(...weights).toFixed(1),
          max: Math.max(...weights).toFixed(1),
          avg: (weights.reduce((sum, w) => sum + w, 0) / weights.length).toFixed(1)
        };
      } catch (e) {
        console.error("Error calculating stats:", e);
        return {
          start: '0.0',
          current: '0.0',
          change: '0.0',
          min: '0.0',
          max: '0.0',
          avg: '0.0'
        };
      }
    };

    const stats = calculateStats(logs);
    const changeIsPositive = parseFloat(stats.change) >= 0;
    const changeText = `${changeIsPositive ? '+' : ''}${stats.change}`;

    // Calculate weekly average change
    const calculateWeeklyChange = (logs) => {
      if (!logs || logs.length < 2) return "0.0";

      try {
        // Filter out logs with invalid dates or weights
        const validLogs = logs.filter(log => {
          const logDate = new Date(log.log_date || log.date);
          const weightValue = parseFloat(log.weight_value || log.weight);
          return !isNaN(logDate.getTime()) && !isNaN(weightValue);
        });

        if (validLogs.length < 2) return "0.0";

        // Sort logs by date
        validLogs.sort((a, b) => {
          const dateA = new Date(a.log_date || a.date);
          const dateB = new Date(b.log_date || b.date);
          return dateA - dateB;
        });

        const firstLog = validLogs[0];
        const lastLog = validLogs[validLogs.length - 1];
        const firstDate = new Date(firstLog.log_date || firstLog.date);
        const lastDate = new Date(lastLog.log_date || lastLog.date);

        // Ensure dates are valid
        if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
          return "0.0";
        }

        const weeksDiff = Math.max(1, differenceInWeeks(lastDate, firstDate));

        const totalChange = parseFloat(lastLog.weight_value || lastLog.weight) -
                            parseFloat(firstLog.weight_value || firstLog.weight);

        return (totalChange / weeksDiff).toFixed(1);
      } catch (e) {
        console.error("Error calculating weekly change:", e);
        return "0.0";
      }
    };

    const weeklyChange = calculateWeeklyChange(logs);
    const weeklyChangeIsPositive = parseFloat(weeklyChange) >= 0;
    const weeklyChangeText = `${weeklyChangeIsPositive ? '+' : ''}${weeklyChange}`;

    // Calculate page dimensions for proper layout
    const pageWidth = doc.page.width - 2 * doc.page.margins.left;

    // Draw the report with careful width management

    // Header with logo - centered with proper width
    doc.fontSize(24).font('Helvetica-Bold').text('Weight Progress Report', { align: 'center', width: pageWidth });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(dateRange, { align: 'center', width: pageWidth });
    doc.moveDown(1);

    // User Information
    if (user) {
      doc.fontSize(14).font('Helvetica-Bold').text('User Information', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Name: ${user.name || 'Not provided'}`);
      if (user.height) doc.text(`Height: ${user.height} cm`);
      doc.moveDown(1);
    }

    // Weight Goal
    if (goal) {
      doc.fontSize(14).font('Helvetica-Bold').text('Weight Goal', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(11);
      doc.text(`Starting Weight: ${goal.start_weight} lbs`, { continued: true })
         .text(`    Target Weight: ${goal.target_weight} lbs`, { align: 'right' });

      doc.text(`Start Date: ${formatDate(goal.start_date)}`, { continued: true });
      if (goal.target_date) {
        doc.text(`    Target Date: ${formatDate(goal.target_date)}`, { align: 'right' });
      } else {
        doc.text('', { align: 'right' });
      }

      // Progress calculation if both start and target weights exist
      if (goal.start_weight && goal.target_weight && logs.length > 0) {
        const latestWeight = parseFloat(logs[logs.length - 1].weight_value || logs[logs.length - 1].weight);
        const totalChange = goal.target_weight - goal.start_weight;
        const currentChange = latestWeight - goal.start_weight;
        const progress = Math.min(100, Math.max(0, (currentChange / totalChange) * 100));

        // Add a visual progress bar
        doc.moveDown(0.5);
        doc.text(`Progress Toward Goal: ${Math.round(progress)}%`);

        // Background for progress bar
        const barWidth = 400;
        doc.rect(50, doc.y + 5, barWidth, 15).fillAndStroke('#eeeeee', '#cccccc');

        // Actual progress
        const progressWidth = (barWidth * Math.min(100, Math.max(0, progress))) / 100;
        const isGain = goal.target_weight > goal.start_weight;
        const barColor = (isGain && currentChange > 0) || (!isGain && currentChange < 0) ? '#32CD32' : '#FF4500';
        doc.rect(50, doc.y + 5, progressWidth, 15).fill(barColor);
      }

      doc.moveDown(1.5);
    }

    // Weight Statistics - add top margin and make text black
    if (stats) {
      doc.moveDown(2); // Add more space before the statistics section
      doc.fontSize(14).font('Helvetica-Bold').text('Weight Statistics', { underline: true });
      doc.moveDown(0.5);

      // Stats table
      const statTableTop = doc.y + 10;
      const statColWidth = 150;

      // Draw a box around the stats
      doc.rect(45, statTableTop - 5, statColWidth * 3 + 10, 50).fillAndStroke('#f9f9f9', '#cccccc');

      // Draw the header row
      doc.font('Helvetica-Bold').fontSize(11);
      doc.fillColor('#333333');
      doc.text('Total Change', 50, statTableTop, { width: statColWidth });
      doc.text('Weekly Avg', 50 + statColWidth, statTableTop, { width: statColWidth });
      doc.text('To Goal', 50 + statColWidth * 2, statTableTop, { width: statColWidth });

      // Draw the second row with values - use darker colors
      // Red for weight gain, green for weight loss (for weight loss goals)
      // Note: For weight gain goals, this would be reversed, but most users are trying to lose weight
      const isWeightLoss = goal ? parseFloat(goal.start_weight) > parseFloat(goal.target_weight) : true;
      const valueColor = (changeIsPositive && !isWeightLoss) || (!changeIsPositive && isWeightLoss)
                        ? '#32CD32' // Green for positive progress
                        : '#FF4500'; // Red for negative progress

      doc.font('Helvetica').fontSize(16);
      doc.fillColor(valueColor).text(
        `${changeText} lbs`,
        50,
        statTableTop + 20,
        { width: statColWidth }
      );

      const weeklyValueColor = (weeklyChangeIsPositive && !isWeightLoss) || (!weeklyChangeIsPositive && isWeightLoss)
                             ? '#32CD32' // Green for positive progress
                             : '#FF4500'; // Red for negative progress

      doc.fillColor(weeklyValueColor).text(
        `${weeklyChangeText} lbs`,
        50 + statColWidth,
        statTableTop + 20,
        { width: statColWidth }
      );

      if (goal && goal.target_weight && logs.length > 0) {
        const latestWeight = parseFloat(logs[logs.length - 1].weight_value || logs[logs.length - 1].weight);
        const toGoal = Math.abs(goal.target_weight - latestWeight).toFixed(1);
        doc.fillColor('#333333').text(
          `${toGoal} lbs`,
          50 + statColWidth * 2,
          statTableTop + 20,
          { width: statColWidth }
        );
      } else {
        doc.fillColor('#999999').text(
          'No goal set',
          50 + statColWidth * 2,
          statTableTop + 20,
          { width: statColWidth }
        );
      }

      doc.fillColor('black');
      doc.moveDown(2.5);
    }

    // Weight Trend Chart
    if (logs.length > 1) {
      doc.fontSize(14).font('Helvetica-Bold').text('Weight Trend', { underline: true });
      doc.moveDown(0.5);

      // Chart dimensions
      const chartX = 50;
      const chartY = doc.y + 10;
      const chartWidth = 500;
      const chartHeight = 200;
      const chartRight = chartX + chartWidth;
      const chartBottom = chartY + chartHeight;

      // Draw chart background and axes
      doc.rect(chartX, chartY, chartWidth, chartHeight).fillAndStroke('#f9f9f9', '#cccccc');

      // Process data for chart
      try {
        let minWeight = Math.min(...logs.map(log => parseFloat(log.weight_value || log.weight)));
        let maxWeight = Math.max(...logs.map(log => parseFloat(log.weight_value || log.weight)));

        // Add some padding to min/max
        const weightPadding = (maxWeight - minWeight) * 0.1 || 1; // Handle case where min/max are the same
        minWeight = Math.max(0, minWeight - weightPadding);
        maxWeight = maxWeight + weightPadding;

        // Safely create data points with error handling
        const safelyCreateDataPoint = (dateStr, weight) => {
          try {
            // Ensure date is valid and not in the future
            const date = new Date(dateStr);
            const now = new Date();

            // If date is invalid or in the future, use current date
            if (isNaN(date.getTime()) || date > now) {
              console.warn(`Invalid date encountered: ${dateStr}, using current date instead`);
              return { date: now, weight };
            }

            return { date, weight };
          } catch (e) {
            console.error(`Error processing date: ${dateStr}`, e);
            return { date: new Date(), weight };
          }
        };

        const dataPoints = isLongTermReport ?
          groupedData.map(week => {
            try {
              const weekStartTime = new Date(week.weekStart).getTime();
              const weekEndTime = new Date(week.weekEnd).getTime();
              // Validate that dates are valid before averaging
              if (isNaN(weekStartTime) || isNaN(weekEndTime)) {
                throw new Error('Invalid week dates');
              }
              return {
                date: new Date((weekStartTime + weekEndTime) / 2),
                weight: parseFloat(week.avgWeight)
              };
            } catch (e) {
              console.error('Error processing week data point:', e);
              return { date: new Date(), weight: parseFloat(week.avgWeight) };
            }
          }) :
          logs.map(log => safelyCreateDataPoint(log.log_date || log.date, parseFloat(log.weight_value || log.weight)));

        if (dataPoints.length > 0) {
          // Sort data points by date to ensure proper chart drawing
          dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());

          const dateMin = dataPoints[0].date;
          const dateMax = dataPoints[dataPoints.length - 1].date;

          // Ensure date range is valid and not zero
          let dateRange = dateMax.getTime() - dateMin.getTime();
          if (dateRange <= 0) {
            dateRange = 24 * 60 * 60 * 1000; // Default to one day if range is invalid
          }

          // Draw y-axis (weight) ticks and labels
          const yAxisTickCount = 5;
          doc.fontSize(8).font('Helvetica');

          for (let i = 0; i <= yAxisTickCount; i++) {
            const weight = minWeight + ((maxWeight - minWeight) * i) / yAxisTickCount;
            const y = chartBottom - (chartHeight * i) / yAxisTickCount;

            // Draw tick line
            doc.strokeColor('#cccccc').moveTo(chartX, y).lineTo(chartRight, y).stroke();

            // Draw label
            doc.fillColor('#666666').text(
              weight.toFixed(1),
              chartX - 25,
              y - 4,
              { width: 20, align: 'right' }
            );
          }

          // Draw x-axis (date) ticks and labels
          const xAxisTickCount = Math.min(6, dataPoints.length);

          for (let i = 0; i < xAxisTickCount; i++) {
            const pointIndex = Math.floor((i * (dataPoints.length - 1)) / (xAxisTickCount - 1));
            const point = dataPoints[pointIndex];
            const x = chartX + (chartWidth * i) / (xAxisTickCount - 1);

            // Draw tick line
            doc.strokeColor('#cccccc').moveTo(x, chartY).lineTo(x, chartBottom).stroke();

            // Safely format date label
            let dateLabel;
            try {
              dateLabel = format(point.date, 'MMM d');
            } catch (e) {
              console.error('Error formatting date label:', e);
              dateLabel = 'Invalid';
            }

            doc.fillColor('#666666').text(
              dateLabel,
              x - 10,
              chartBottom + 5,
              { width: 30, align: 'center' }
            );
          }

          // Draw the weight line
          doc.strokeColor('#007bff').lineWidth(2);
          let pathString = '';
          let prevX, prevY;

          // Draw data points
          dataPoints.forEach((point, i) => {
            try {
              const normalizedDate = (point.date.getTime() - dateMin.getTime()) / dateRange;
              const normalizedWeight = (point.weight - minWeight) / (maxWeight - minWeight || 1);

              const x = chartX + (normalizedDate * chartWidth);
              const y = chartBottom - (normalizedWeight * chartHeight);

              if (i === 0) {
                pathString = `M ${x} ${y}`;
                prevX = x;
                prevY = y;
              } else {
                pathString += ` L ${x} ${y}`;
                prevX = x;
                prevY = y;
              }
            } catch (e) {
              console.error('Error drawing data point:', e);
              // Skip this point
            }
          });

          // Draw path only if we have valid points
          if (pathString && pathString.length > 0) {
            doc.path(pathString).stroke();
          }

          // Add data points
          dataPoints.forEach(point => {
            try {
              const normalizedDate = (point.date.getTime() - dateMin.getTime()) / dateRange;
              const normalizedWeight = (point.weight - minWeight) / (maxWeight - minWeight || 1);

              const x = chartX + (normalizedDate * chartWidth);
              const y = chartBottom - (normalizedWeight * chartHeight);

              doc.circle(x, y, 3).fillAndStroke('#007bff', '#ffffff');
            } catch (e) {
              console.error('Error drawing circle for data point:', e);
              // Skip this point
            }
          });

          // Add target weight line if available
          if (goal && goal.target_weight) {
            try {
              const targetWeight = parseFloat(goal.target_weight);
              if (!isNaN(targetWeight) && targetWeight >= minWeight && targetWeight <= maxWeight) {
                const normalizedTargetWeight = (targetWeight - minWeight) / (maxWeight - minWeight || 1);
                const targetY = chartBottom - (normalizedTargetWeight * chartHeight);

                doc.strokeColor('#32CD32').strokeOpacity(0.6).lineWidth(1).dash(5, {space: 5})
                  .moveTo(chartX, targetY)
                  .lineTo(chartRight, targetY)
                  .stroke().undash().strokeOpacity(1);

                // Add label
                doc.fillColor('#32CD32').text(
                  'Goal',
                  chartRight + 5,
                  targetY - 4,
                  { width: 30 }
                );
              }
            } catch (e) {
              console.error('Error drawing target weight line:', e);
              // Continue without drawing the target line
            }
          }
        } else {
          // Handle no data points case
          doc.fontSize(12).font('Helvetica').fillColor('#666666');
          doc.text('No data available for chart', chartX + chartWidth/2 - 70, chartY + chartHeight/2);
        }
      } catch (error) {
        console.error('Error generating chart:', error);
        doc.fontSize(12).font('Helvetica').fillColor('#666666');
        doc.text('Error generating chart visualization', chartX + chartWidth/2 - 100, chartY + chartHeight/2);
      }

      doc.moveDown(chartHeight / doc.currentLineHeight() + 1);
    }

    // Page setup for multi-page documents
    const setupNewPage = (title) => {
      doc.addPage();

      // Header for the new page
      doc.fontSize(18).font('Helvetica-Bold').fillColor('black')
        .text('Weight Progress Report', { align: 'center', width: pageWidth });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(dateRange, { align: 'center', width: pageWidth });
      doc.moveDown(1);

      doc.fontSize(14).font('Helvetica-Bold')
        .text(title, { underline: true, width: pageWidth });
      doc.moveDown(0.5);

      return 50; // Return the Y position after the header
    };

    // Logs Table - with proper width management
    // If we're already on page 2+ (after the chart), start a new page for logs
    if (doc.y > doc.page.height - 300) {
      y = setupNewPage(isLongTermReport ? 'Weekly Weight Summary' : 'Weight Logs');
    } else {
      doc.fillColor('black').fontSize(14).font('Helvetica-Bold')
        .text(isLongTermReport ? 'Weekly Weight Summary' : 'Weight Logs', { underline: true, width: pageWidth });
      doc.moveDown(0.5);
      y = doc.y;
    }

    const tableTop = y;

    // Calculate column widths proportionally to fit page
    const totalWidth = pageWidth - 10; // 10px buffer
    const dateWidth = Math.floor(totalWidth * 0.25);  // 25% of space
    const weightWidth = Math.floor(totalWidth * 0.20); // 20% of space
    const changeWidth = Math.floor(totalWidth * 0.20); // 20% of space
    const notesWidth = Math.floor(totalWidth * 0.35);  // 35% of space

    const tableX = doc.page.margins.left;

    // Table header background with no space for vertical text
    doc.rect(tableX, tableTop - 5, totalWidth, 25).fill('#007bff');

    // Table header
    doc.font('Helvetica-Bold').fontSize(10);
    doc.fillColor('#ffffff');
    if (isLongTermReport) {
      doc.text('Week', tableX + 5, tableTop, { width: dateWidth });
      doc.text('Avg Weight', tableX + dateWidth + 5, tableTop, { width: weightWidth });
      doc.text('Range', tableX + dateWidth + weightWidth + 5, tableTop, { width: changeWidth });
      doc.text('Readings', tableX + dateWidth + weightWidth + changeWidth + 5, tableTop, { width: notesWidth });
    } else {
      doc.text('Date', tableX + 5, tableTop, { width: dateWidth });
      doc.text('Weight', tableX + dateWidth + 5, tableTop, { width: weightWidth });
      doc.text('Change', tableX + dateWidth + weightWidth + 5, tableTop, { width: changeWidth });
      doc.text('Notes', tableX + dateWidth + weightWidth + changeWidth + 5, tableTop, { width: notesWidth });
    }

    // Table rows
    y = tableTop + 20;
    let previousWeight = null;

    if (isLongTermReport) {
      // Weekly summary rows
      groupedData.forEach((week, index) => {
        // Add new page if we're about to go off the page
        if (y > doc.page.height - 100) {
          y = setupNewPage('Weekly Weight Summary (Continued)');

          // Table header background
          doc.rect(tableX, y - 5, totalWidth, 25).fill('#007bff');

          // Table header text
          doc.font('Helvetica-Bold').fontSize(10);
          doc.fillColor('#ffffff');
          doc.text('Week', tableX + 5, y, { width: dateWidth });
          doc.text('Avg Weight', tableX + dateWidth + 5, y, { width: weightWidth });
          doc.text('Range', tableX + dateWidth + weightWidth + 5, y, { width: changeWidth });
          doc.text('Readings', tableX + dateWidth + weightWidth + changeWidth + 5, y, { width: notesWidth });
          y += 20;
        }

        // Draw row with alternating colors
        doc.rect(tableX, y - 5, totalWidth, 25)
          .fill(index % 2 === 0 ? '#f6f6f6' : '#ffffff');

        doc.font('Helvetica').fontSize(10).fillColor('black');
        let weekRange;
        try {
          // Ensure weekStart and weekEnd are valid dates
          const weekStartDate = new Date(week.weekStart);
          const weekEndDate = new Date(week.weekEnd);

          if (!isNaN(weekStartDate.getTime()) && !isNaN(weekEndDate.getTime())) {
            weekRange = `${format(weekStartDate, 'MMM d')} - ${format(weekEndDate, 'MMM d')}`;
          } else {
            weekRange = 'Invalid Date Range';
          }
        } catch (error) {
          console.error('Error formatting week range:', error);
          weekRange = 'Invalid Date Range';
        }

        doc.text(weekRange, tableX + 5, y, { width: dateWidth });
        doc.text(`${week.avgWeight} lbs`, tableX + dateWidth + 5, y, { width: weightWidth });
        doc.text(week.weightRange, tableX + dateWidth + weightWidth + 5, y, { width: changeWidth });
        doc.text(`${week.count}`, tableX + dateWidth + weightWidth + changeWidth + 5, y, { width: notesWidth });

        y += 25;
      });
    } else {
      // Daily logs
      groupedData.forEach((log, index) => {
        // Add new page if we're about to go off the page
        if (y > doc.page.height - 100) {
          y = setupNewPage('Weight Logs (Continued)');

          // Table header background
          doc.rect(tableX, y - 5, totalWidth, 25).fill('#007bff');

          // Table header text
          doc.font('Helvetica-Bold').fontSize(10);
          doc.fillColor('#ffffff');
          doc.text('Date', tableX + 5, y, { width: dateWidth });
          doc.text('Weight', tableX + dateWidth + 5, y, { width: weightWidth });
          doc.text('Change', tableX + dateWidth + weightWidth + 5, y, { width: changeWidth });
          doc.text('Notes', tableX + dateWidth + weightWidth + changeWidth + 5, y, { width: notesWidth });
          y += 20;
        }

        // Draw row with alternating colors
        doc.rect(tableX, y - 5, totalWidth, 25)
          .fill(index % 2 === 0 ? '#f6f6f6' : '#ffffff');

        const weight = parseFloat(log.weight_value || log.weight);
        let change = '';

        if (previousWeight !== null) {
          const weightChange = weight - previousWeight;
          change = `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`;
        }

        previousWeight = weight;

        doc.font('Helvetica').fontSize(10).fillColor('black');
        let formattedDate;
        try {
          const logDate = new Date(log.log_date || log.date);
          formattedDate = isNaN(logDate.getTime()) ? 'Invalid Date' : formatDate(logDate);
        } catch (error) {
          console.error('Error formatting log date:', error);
          formattedDate = 'Invalid Date';
        }

        doc.text(formattedDate, tableX + 5, y, { width: dateWidth });
        doc.text(`${weight.toFixed(1)} lbs`, tableX + dateWidth + 5, y, { width: weightWidth });
        doc.text(change, tableX + dateWidth + weightWidth + 5, y, { width: changeWidth });
        doc.text(log.notes || '', tableX + dateWidth + weightWidth + changeWidth + 5, y, { width: notesWidth });

        y += 25;
      });
    }

    // Footer using full width
    doc.fontSize(8).font('Helvetica');
    doc.text('Generated by Nutrition Tracker App on ' + format(new Date(), 'MMM d, yyyy'), doc.page.margins.left, doc.page.height - 50, { align: 'center', width: pageWidth });

    // Fix for page numbering with full width
    doc.text(`Page ${doc.bufferedPageRange().start + 1}`, doc.page.margins.left, doc.page.height - 35, { align: 'center', width: pageWidth });

    // Finalize the PDF and end the response
    doc.end();
  } catch (error) {
    console.error('Error generating weight PDF report:', error);
    res.status(500).json({ message: 'Error generating weight report' });
  }
});

module.exports = router;