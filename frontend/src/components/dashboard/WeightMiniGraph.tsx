import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { weightService } from '../../services/weightService';
import { SkeletonLoader } from '../common';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';

interface WeightMiniGraphProps {
  showActualWeight?: boolean;
  days?: number; // This will be used as a fallback if goal data isn't available
}

const WeightMiniGraph: React.FC<WeightMiniGraphProps> = ({
  showActualWeight = false,
  days = 90 // Default to 90 days as fallback
}) => {
  const theme = useTheme();

  const styles = StyleSheet.create({
    card: {
      marginVertical: -8,
      elevation: 0,
      borderWidth: 0,
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      backgroundColor: 'transparent',
    },
    container: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
    },
    graphSvg: {
      position: 'relative',
    },
    errorContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      height: 100,
    },
    errorText: {
      color: theme.colors.error,
    },
    noDataContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      height: 100,
    },
    noDataText: {
      color: '#666',
    },
    valuesContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      position: 'relative',
    },
    valueText: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightGoal, setWeightGoal] = useState<any>(null);
  const [pathData, setPathData] = useState('');
  const [minMaxValues, setMinMaxValues] = useState({ min: 0, max: 0 });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [goalStartDate, setGoalStartDate] = useState<Date | null>(null);
  const [goalTargetWeight, setGoalTargetWeight] = useState<number | null>(null);

  const width = Dimensions.get('window').width - 100; // Increased padding to prevent overflow and add more right padding
  const height = 100; // Fixed height for mini graph
  const paddingHorizontal = 24; // Increased horizontal padding
  const paddingVertical = 16;
  const graphWidth = width - (paddingHorizontal * 2);
  const graphHeight = height - (paddingVertical * 2);

  useEffect(() => {
    loadWeightData();
  }, [days]);

  const loadWeightData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get weight goal
      const goal = await weightService.getWeightGoal();
      setWeightGoal(goal);

      // Get date range for logs - use goal start date if available
      const endDate = new Date();
      let startDate = new Date();

      // Check if user has reached their goal weight
      let useGoalPeriod = true;
      if (goal) {
        // Get the most recent weight log
        const recentLogs = await weightService.getWeightLogs();
        const currentWeight = recentLogs.length > 0 ? parseFloat(recentLogs[0].weight_value.toString()) : null;
        const targetWeight = goal.target_weight ? parseFloat(goal.target_weight.toString()) : null;

        // If current weight exists and target weight exists, check if goal is reached
        if (currentWeight !== null && targetWeight !== null) {
          // For weight loss goals, check if at or below target
          if (goal.start_weight > goal.target_weight) {
            useGoalPeriod = currentWeight > targetWeight;
          }
          // For weight gain goals, check if at or above target
          else if (goal.start_weight < goal.target_weight) {
            useGoalPeriod = currentWeight < targetWeight;
          }
        }
      }

      if (goal && goal.start_date && useGoalPeriod) {
        // Use the goal's start date
        startDate = new Date(goal.start_date);
        setGoalStartDate(startDate);

        // Store the target weight for potential use in visualization
        if (goal.target_weight) {
          setGoalTargetWeight(parseFloat(goal.target_weight.toString()));
        }
      } else {
        // Use last 30 days if goal is reached or no goal exists
        startDate.setDate(startDate.getDate() - 30);
      }

      // Get weight logs for date range
      const logs = await weightService.getWeightLogsForDateRange(startDate, endDate);

      // Sort logs by date
      const sortedLogs = [...logs].sort((a, b) => {
        return new Date(a.log_date).getTime() - new Date(b.log_date).getTime();
      });

      setWeightLogs(sortedLogs);

      // Generate path data if we have logs
      if (sortedLogs.length > 0) {
        generatePathData(sortedLogs, goal);
      }
    } catch (err) {
      console.error('Error loading weight data for graph:', err);
      setError('Failed to load weight data');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePathData = (logs: any[], goal: any) => {
    if (!logs.length) return;

    // Find min and max weight values to scale the graph
    let minWeight = Math.min(...logs.map(log => log.weight_value));
    let maxWeight = Math.max(...logs.map(log => log.weight_value));

    // Include goal weights in min/max calculation if available
    if (goal) {
      if (goal.start_weight) {
        const startWeight = parseFloat(goal.start_weight.toString());
        minWeight = Math.min(minWeight, startWeight);
        maxWeight = Math.max(maxWeight, startWeight);
      }

      if (goal.target_weight) {
        const targetWeight = parseFloat(goal.target_weight.toString());
        minWeight = Math.min(minWeight, targetWeight);
        maxWeight = Math.max(maxWeight, targetWeight);
      }
    }

    // Add some padding to min/max
    const padding = (maxWeight - minWeight) * 0.1;
    minWeight = Math.max(0, minWeight - padding);
    maxWeight = maxWeight + padding;

    setMinMaxValues({ min: minWeight, max: maxWeight });

    // Calculate x and y coordinates for each point
    const points = logs.map((log, index) => {
      const x = paddingHorizontal + (index / (logs.length - 1 || 1)) * graphWidth;
      const normalizedY = (log.weight_value - minWeight) / (maxWeight - minWeight || 1);
      const y = paddingVertical + graphHeight - (normalizedY * graphHeight);
      return { x, y };
    });

    // Generate SVG path data
    let pathData = '';
    points.forEach((point, index) => {
      if (index === 0) {
        pathData += `M ${point.x} ${point.y}`;
      } else {
        pathData += ` L ${point.x} ${point.y}`;
      }
    });

    setPathData(pathData);

    // Set start and end points for the trend line
    if (points.length > 0) {
      setStartPoint(points[0]);
      setEndPoint(points[points.length - 1]);
    }
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <SkeletonLoader width="100%" height={100} />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </Card.Content>
      </Card>
    );
  }

  // If no weight logs exist
  if (weightLogs.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No weight logs available</Text>
        </Card.Content>
      </Card>
    );
  }

  // Determine if trend is positive (weight going up) or negative (weight going down)
  const isGain = weightGoal && weightGoal.target_weight > weightGoal.start_weight;
  const firstLog = weightLogs[0];
  const lastLog = weightLogs[weightLogs.length - 1];
  const weightTrend = lastLog.weight_value - firstLog.weight_value;

  // Determine if trend is good or bad based on goal
  const isTrendPositive = (isGain && weightTrend > 0) || (!isGain && weightTrend < 0);
  const trendColor = isTrendPositive ? theme.colors.primary : theme.colors.error;

  // Calculate the time period for display
  const startDateStr = goalStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  let timePeriodText = `Last 30 days`;
  if (goalStartDate) {
    timePeriodText = `${startDateStr} - ${today}`;
  }

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.container}>
        <Svg width={width} height={height} style={styles.graphSvg}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
              <Stop offset="100%" stopColor={trendColor} stopOpacity={0.05} />
            </LinearGradient>
          </Defs>

          {/* Area under the line */}
          <Path
            d={`${pathData} L ${endPoint.x} ${paddingVertical + graphHeight} L ${startPoint.x} ${paddingVertical + graphHeight} Z`}
            fill="url(#gradient)"
          />

          {/* Trend line */}
          <Line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke={trendColor}
            strokeWidth={2}
            strokeDasharray="4,4"
          />

          {/* Weight line */}
          <Path
            d={pathData}
            fill="none"
            stroke={trendColor}
            strokeWidth={3}
          />

          {/* Start point */}
          <Circle
            cx={startPoint.x}
            cy={startPoint.y}
            r={4}
            fill="white"
            stroke={trendColor}
            strokeWidth={2}
          />

          {/* End point */}
          <Circle
            cx={endPoint.x}
            cy={endPoint.y}
            r={4}
            fill={trendColor}
            stroke="white"
            strokeWidth={2}
          />

          {/* Goal line */}
          {weightGoal && weightGoal.target_weight && (
            <>
              <Line
                x1={paddingHorizontal}
                y1={paddingVertical + graphHeight - ((weightGoal.target_weight - minMaxValues.min) / (minMaxValues.max - minMaxValues.min) * graphHeight)}
                x2={paddingHorizontal + graphWidth}
                y2={paddingVertical + graphHeight - ((weightGoal.target_weight - minMaxValues.min) / (minMaxValues.max - minMaxValues.min) * graphHeight)}
                stroke="#ccc"
                strokeWidth={1}
                strokeDasharray="5,5"
              />
              {/* Goal text */}
              <SvgText
                x={paddingHorizontal + 20}
                y={paddingVertical + graphHeight - ((weightGoal.target_weight - minMaxValues.min) / (minMaxValues.max - minMaxValues.min) * graphHeight) - 5}
                fontSize="10"
                fill="#999"
              >
                Goal
              </SvgText>
            </>
          )}
        </Svg>

        {/* Show weight values if enabled */}
        {showActualWeight && (
          <View style={styles.valuesContainer}>
            <Text style={styles.valueText}>
              {startDateStr}
            </Text>
            <Text style={[styles.valueText, { color: trendColor }]}>
            </Text>
            <Text style={styles.valueText}>
              {today}
            </Text>
          </View>
        )}

        {/* Show percentage change instead of actual values */}
        {!showActualWeight && weightGoal && (
          <View style={styles.valuesContainer}>
            <Text style={styles.valueText}>
              {startDateStr}
            </Text>
            <Text style={styles.valueText}>
              {today}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

export default WeightMiniGraph;