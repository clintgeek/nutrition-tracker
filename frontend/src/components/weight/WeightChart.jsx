import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart
} from 'recharts';
import { View, Text, StyleSheet } from 'react-native';
import { format, differenceInDays } from 'date-fns';

const WeightChart = ({ data, timeRange, showActualWeight = true, weightGoal }) => {
  // Process data based on time span - calculate weekly averages for longer spans
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    // Make a copy and sort by date (newest first)
    let processedData = [...data];
    processedData.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    // For longer time spans, we'll show weekly averages
    if (['3months', 'year', 'goal'].includes(timeRange) && processedData.length > 0) {
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
            weightSum: 0,
            weightCount: 0
          };
          weeklyData.push(weekData);
        }

        // Add this log's data to the weekly totals
        if (log.weight_value) {
          weekData.weightSum += parseFloat(log.weight_value);
          weekData.weightCount++;
        }
      });

      // Sort weeks chronologically
      weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

      // Calculate averages and format for chart
      return weeklyData.map(week => ({
        date: format(week.weekStart, 'MM/dd'),
        weight: week.weightCount > 0 ? parseFloat((week.weightSum / week.weightCount).toFixed(1)) : null,
        log_date: week.weekStart.toISOString()
      }));
    } else {
      // For shorter time spans, use all data points
      // Limit the number of points for better display
      let maxPoints;
      switch (timeRange) {
        case 'week':
          maxPoints = 30;
          break;
        case 'month':
          maxPoints = 40;
          break;
        default:
          maxPoints = 60;
      }

      // Take the most recent logs
      const recentLogs = processedData.slice(0, maxPoints);

      // Sort by date (oldest to newest) for display
      recentLogs.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

      // Format dates based on time span
      return recentLogs.map(log => {
        const logDate = new Date(log.log_date);
        return {
          ...log,
          date: format(logDate, 'MM/dd'),
          weight: parseFloat(log.weight_value)
        };
      });
    }
  }, [data, timeRange]);

  // Add goal data if available
  const enhancedChartData = useMemo(() => {
    if (!chartData.length || !weightGoal || !weightGoal.target_weight || !weightGoal.start_weight || !weightGoal.start_date || !weightGoal.target_date) {
      return chartData;
    }

    // Calculate target weight line
    const startDate = new Date(weightGoal.start_date);
    const targetDate = new Date(weightGoal.target_date);
    const totalDays = differenceInDays(targetDate, startDate) || 1;

    // Ensure goal weights are numbers
    const startWeight = parseFloat(weightGoal.start_weight) || 0;
    const targetWeight = parseFloat(weightGoal.target_weight) || 0;

    return chartData.map(point => {
      const pointDate = new Date(point.log_date);
      // Only add goal data if the point is within the goal period
      if (pointDate >= startDate && pointDate <= targetDate) {
        const daysSinceStart = differenceInDays(pointDate, startDate);
        const progressRatio = daysSinceStart / totalDays;
        const goalWeight = startWeight + (progressRatio * (targetWeight - startWeight));

        return {
          ...point,
          goalWeight: isNaN(goalWeight) ? 0 : parseFloat(goalWeight.toFixed(1))
        };
      }
      return point;
    });
  }, [chartData, weightGoal]);

  // Calculate min/max values for chart scaling
  const minMaxValues = useMemo(() => {
    if (!enhancedChartData.length) {
      return { min: 0, max: 200 };
    }

    // Safe value extraction with fallbacks
    const extractSafeNumber = (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // Get all weight values, filtering out invalid ones
    const allWeights = enhancedChartData
      .map(log => extractSafeNumber(log.weight))
      .filter(w => w !== null);

    // Add goal weights if available
    const goalStartWeight = weightGoal?.start_weight ? extractSafeNumber(weightGoal.start_weight) : null;
    const goalTargetWeight = weightGoal?.target_weight ? extractSafeNumber(weightGoal.target_weight) : null;

    // Combine all valid weights
    const validWeights = [...allWeights];
    if (goalStartWeight !== null) validWeights.push(goalStartWeight);
    if (goalTargetWeight !== null) validWeights.push(goalTargetWeight);

    if (validWeights.length === 0) {
      return { min: 0, max: 200 };
    }

    let minWeight = Math.min(...validWeights);
    let maxWeight = Math.max(...validWeights);

    // Add padding
    const padding = (maxWeight - minWeight) * 0.1;
    minWeight = Math.max(0, minWeight - padding);
    maxWeight = maxWeight + padding;

    return { min: minWeight, max: maxWeight };
  }, [enhancedChartData, weightGoal]);

  if (enhancedChartData.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No weight data available</Text>
      </View>
    );
  }

  // Determine trend color based on goal direction
  const isGain = weightGoal && parseFloat(weightGoal.target_weight) > parseFloat(weightGoal.start_weight);
  const firstLog = data && data.length > 0 ? data[0] : null;
  const lastLog = data && data.length > 0 ? data[data.length - 1] : null;

  // Safely calculate weight trend
  const safeParseFloat = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const weightTrend = (firstLog && lastLog) ?
    safeParseFloat(lastLog.weight_value) - safeParseFloat(firstLog.weight_value) : 0;

  const isTrendPositive = (isGain && weightTrend > 0) || (!isGain && weightTrend < 0);
  const trendColor = isTrendPositive ? '#2196F3' : '#FF5722';

  return (
    <View style={styles.container}>
      {['3months', 'year', 'goal'].includes(timeRange) && (
        <Text style={styles.averageIndicator}>Weekly Averages</Text>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={enhancedChartData}
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
            domain={[minMaxValues.min, minMaxValues.max]}
            tick={{ fontSize: 10, fill: '#666' }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => {
              if (name === 'weight') return [`${value} lbs`, 'Weight'];
              if (name === 'goalWeight') return [`${value} lbs`, 'Goal'];
              return [value, name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend verticalAlign="top" height={36} />

          {/* Weight line with gradient area underneath */}
          <defs>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={trendColor} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={trendColor} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="weight"
            name="Weight"
            stroke={trendColor}
            fillOpacity={1}
            fill="url(#colorWeight)"
          />

          {/* Goal line */}
          {weightGoal && weightGoal.target_weight &&
            <Line
              type="linear"
              dataKey="goalWeight"
              name="Goal"
              stroke="#666"
              strokeDasharray="5 5"
              dot={false}
            />
          }
        </ComposedChart>
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

export default WeightChart;