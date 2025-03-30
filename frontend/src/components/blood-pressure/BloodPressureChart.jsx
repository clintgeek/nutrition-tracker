import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

const BloodPressureChart = ({ data, timeSpan }) => {
  // Process data based on time span - calculate weekly averages for longer spans
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Make a copy and sort by date (newest first)
    let processedData = [...data];
    processedData.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    // For longer time spans, we'll show weekly averages
    if (['6M', '1Y', 'ALL'].includes(timeSpan) && processedData.length > 0) {
      // Sort logs by date (oldest first for grouping)
      processedData.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Group logs by week
      const weeklyData = [];

      // Process each log
      processedData.forEach(log => {
        const logDate = new Date(log.log_date);
        // Find or create the week for this log
        const weekStart = new Date(logDate);
        // Set to the start of the week (Sunday)
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day);
        // Reset hours to start of day
        weekStart.setHours(0, 0, 0, 0);

        // Find the week in our data or create a new entry
        let weekData = weeklyData.find(w =>
          w.weekStart.getTime() === weekStart.getTime()
        );

        if (!weekData) {
          weekData = {
            weekStart,
            systolicSum: 0,
            systolicCount: 0,
            diastolicSum: 0,
            diastolicCount: 0
          };
          weeklyData.push(weekData);
        }

        // Add this log's data to the weekly totals
        if (log.systolic) {
          weekData.systolicSum += log.systolic;
          weekData.systolicCount++;
        }

        if (log.diastolic) {
          weekData.diastolicSum += log.diastolic;
          weekData.diastolicCount++;
        }
      });

      // Sort weeks chronologically
      weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      // Calculate averages and format for chart
      return weeklyData.map(week => ({
        date: format(week.weekStart, 'MM/dd'),
        systolic: week.systolicCount > 0 ? Math.round(week.systolicSum / week.systolicCount) : null,
        diastolic: week.diastolicCount > 0 ? Math.round(week.diastolicSum / week.diastolicCount) : null,
        log_date: week.weekStart.toISOString()
      }));
    } else {
      // For shorter time spans, use all data points
      // Limit the number of points for better display
      let maxPoints;
      switch (timeSpan) {
        case '7D':
          maxPoints = 30;
          break;
        case '1M':
          maxPoints = 40;
          break;
        case '3M':
          maxPoints = 50;
          break;
        default:
          maxPoints = 60;
      }

      // Take the most recent logs first (already sorted newest to oldest)
      const recentLogs = processedData.slice(0, maxPoints);

      // Sort by date (oldest to newest) for display
      recentLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Format dates based on time span
      return recentLogs.map(log => {
        const logDate = new Date(log.log_date);
        return {
          ...log,
          date: timeSpan === '7D' ? format(logDate, 'MM/dd HH:mm') : format(logDate, 'MM/dd')
        };
      });
    }
  }, [data, timeSpan]);

  // Calculate max values for better chart scaling
  const maxSystolic = Math.max(...(chartData.map(log => log.systolic || 0)), 0) + 10;
  const maxDiastolic = Math.max(...(chartData.map(log => log.diastolic || 0)), 0) + 10;
  const yAxisMax = Math.max(maxSystolic, 160);  // Ensure at least 160 to show high blood pressure range

  if (chartData.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No blood pressure data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {['6M', '1Y', 'ALL'].includes(timeSpan) && (
        <Text style={styles.averageIndicator}>Weekly Averages</Text>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 5,
            bottom: 50, // More space for rotated labels
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
            angle={-45}
            textAnchor="end"
            height={60}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            domain={[60, yAxisMax]}
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [value, name === 'systolic' ? 'Systolic' : 'Diastolic']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="systolic"
            name="Systolic"
            stroke="#ff0000"
            activeDot={{ r: 6 }}
            strokeWidth={2}
            dot={{ stroke: '#ff0000', strokeWidth: 1, r: 3 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="diastolic"
            name="Diastolic"
            stroke="#0000ff"
            activeDot={{ r: 6 }}
            strokeWidth={2}
            dot={{ stroke: '#0000ff', strokeWidth: 1, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  averageIndicator: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
  },
});

export default BloodPressureChart;