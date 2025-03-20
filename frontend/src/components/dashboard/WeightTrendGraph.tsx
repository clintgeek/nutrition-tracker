import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { weightService } from '../../services/weightService';
import { SkeletonLoader } from '../common';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';
import { format, subDays, subMonths, differenceInDays } from 'date-fns';

interface WeightTrendGraphProps {
  timeRange?: 'week' | 'month' | '3months' | 'year' | 'goal';
  showActualWeight?: boolean;
}

const WeightTrendGraph: React.FC<WeightTrendGraphProps> = ({
  timeRange = 'month',
  showActualWeight = true
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [weightGoal, setWeightGoal] = useState<any>(null);
  const [pathData, setPathData] = useState('');
  const [minMaxValues, setMinMaxValues] = useState({ min: 0, max: 0 });
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [projectedPathData, setProjectedPathData] = useState('');
  const [dataPoints, setDataPoints] = useState<{x: number, y: number, weight: number, date: Date}[]>([]);

  const width = Dimensions.get('window').width - 80; // Further increased padding to prevent overflow
  const height = 250; // Fixed height for detailed graph
  const paddingHorizontal = 50; // Further increased horizontal padding
  const paddingVertical = 40;
  const graphWidth = width - (paddingHorizontal * 2);
  const graphHeight = height - (paddingVertical * 2);

  useEffect(() => {
    loadWeightData();
  }, [selectedTimeRange]);

  const loadWeightData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get weight goal
      const goal = await weightService.getWeightGoal();
      setWeightGoal(goal);

      // Get date range for logs
      const endDate = new Date();
      let startDate = new Date();

      switch (selectedTimeRange) {
        case 'week':
          startDate = subDays(endDate, 7);
          break;
        case 'month':
          startDate = subDays(endDate, 30);
          break;
        case '3months':
          startDate = subMonths(endDate, 3);
          break;
        case 'year':
          startDate = subMonths(endDate, 12);
          break;
        case 'goal':
          if (goal && goal.start_date) {
            startDate = new Date(goal.start_date);
          } else {
            startDate = subMonths(endDate, 3); // Default if no goal
          }
          break;
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
        generatePathData(sortedLogs, goal, startDate, endDate);
      }
    } catch (err) {
      console.error('Error loading weight data for graph:', err);
      setError('Failed to load weight data');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePathData = (logs: any[], goal: any, startDate: Date, endDate: Date) => {
    if (!logs.length) return;

    // Find min and max weight values to scale the graph
    let minWeight = Math.min(...logs.map(log => log.weight_value));
    let maxWeight = Math.max(...logs.map(log => log.weight_value));

    // Include goal weights in min/max calculation if available
    if (goal) {
      if (goal.start_weight) {
        minWeight = Math.min(minWeight, goal.start_weight);
        maxWeight = Math.max(maxWeight, goal.start_weight);
      }
      if (goal.target_weight) {
        minWeight = Math.min(minWeight, goal.target_weight);
        maxWeight = Math.max(maxWeight, goal.target_weight);
      }
    }

    // Add some padding to min/max
    const padding = (maxWeight - minWeight) * 0.1;
    minWeight = Math.max(0, minWeight - padding);
    maxWeight = maxWeight + padding;

    setMinMaxValues({ min: minWeight, max: maxWeight });

    // Calculate total days in range for x-axis scaling
    const totalDays = differenceInDays(endDate, startDate) || 1;

    // Calculate x and y coordinates for each point
    const points = logs.map(log => {
      const logDate = new Date(log.log_date);
      const daysSinceStart = differenceInDays(logDate, startDate);
      const x = paddingHorizontal + (daysSinceStart / totalDays) * graphWidth;
      const normalizedY = (log.weight_value - minWeight) / (maxWeight - minWeight || 1);
      const y = paddingVertical + graphHeight - (normalizedY * graphHeight);
      return {
        x,
        y,
        weight: log.weight_value,
        date: logDate
      };
    });

    setDataPoints(points);

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

    // Generate projected path if goal exists
    if (goal && goal.target_date && goal.target_weight) {
      const goalDate = new Date(goal.target_date);

      // Only show projection if goal date is in the future
      if (goalDate > endDate) {
        const daysSinceStart = differenceInDays(goalDate, startDate);
        const goalX = paddingHorizontal + (daysSinceStart / totalDays) * graphWidth;
        const normalizedGoalY = (goal.target_weight - minWeight) / (maxWeight - minWeight || 1);
        const goalY = paddingVertical + graphHeight - (normalizedGoalY * graphHeight);

        // Use the last actual data point as the start of the projection
        const lastPoint = points[points.length - 1];

        // Create the projected path
        const projectedPath = `M ${lastPoint.x} ${lastPoint.y} L ${goalX} ${goalY}`;
        setProjectedPathData(projectedPath);
      }
    }
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      <Button
        mode={selectedTimeRange === 'week' ? 'contained' : 'outlined'}
        onPress={() => setSelectedTimeRange('week')}
        style={styles.timeRangeButton}
        labelStyle={styles.timeRangeButtonLabel}
        compact
      >
        Week
      </Button>
      <Button
        mode={selectedTimeRange === 'month' ? 'contained' : 'outlined'}
        onPress={() => setSelectedTimeRange('month')}
        style={styles.timeRangeButton}
        labelStyle={styles.timeRangeButtonLabel}
        compact
      >
        Month
      </Button>
      <Button
        mode={selectedTimeRange === '3months' ? 'contained' : 'outlined'}
        onPress={() => setSelectedTimeRange('3months')}
        style={styles.timeRangeButton}
        labelStyle={styles.timeRangeButtonLabel}
        compact
      >
        3 Months
      </Button>
      <Button
        mode={selectedTimeRange === 'year' ? 'contained' : 'outlined'}
        onPress={() => setSelectedTimeRange('year')}
        style={styles.timeRangeButton}
        labelStyle={styles.timeRangeButtonLabel}
        compact
      >
        Year
      </Button>
      <Button
        mode={selectedTimeRange === 'goal' ? 'contained' : 'outlined'}
        onPress={() => setSelectedTimeRange('goal')}
        style={styles.timeRangeButton}
        labelStyle={styles.timeRangeButtonLabel}
        compact
      >
        Goal
      </Button>
    </View>
  );

  if (isLoading) {
    return (
      <Card style={{
        backgroundColor: '#fff',
        marginBottom: 16,
        elevation: 0,
        borderWidth: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0
      }}>
        <Card.Content>
          <SkeletonLoader width="100%" height={250} />
          <View style={styles.timeRangeContainer}>
            {[1, 2, 3, 4, 5].map(i => (
              <SkeletonLoader key={i} width={60} height={30} style={styles.skeletonButton} />
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{
        backgroundColor: '#fff',
        marginBottom: 16,
        elevation: 0,
        borderWidth: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0
      }}>
        <Card.Content style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </Card.Content>
      </Card>
    );
  }

  // If no weight logs exist
  if (weightLogs.length === 0) {
    return (
      <Card style={{
        backgroundColor: '#fff',
        marginBottom: 16,
        elevation: 0,
        borderWidth: 0,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0
      }}>
        <Card.Content style={styles.noDataContainer}>
          <MaterialCommunityIcons
            name="scale-bathroom"
            size={40}
            color="#999"
            style={styles.noDataIcon}
          />
          <Text style={styles.noDataTitle}>No Weight Data</Text>
          <Text style={styles.noDataText}>
            Add weight logs in the Weight Goals section to see your progress over time.
          </Text>
          {renderTimeRangeSelector()}
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

  // Calculate average change per week
  const totalDays = differenceInDays(new Date(lastLog.log_date), new Date(firstLog.log_date)) || 1;
  const weeksElapsed = totalDays / 7;
  const avgChangePerWeek = weeksElapsed > 0 ? weightTrend / weeksElapsed : 0;

  return (
    <Card style={{
      backgroundColor: '#fff',
      marginBottom: 16,
      elevation: 2,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    }}>
      <Card.Content style={styles.container}>
        <View style={styles.graphContainer}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={trendColor} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={trendColor} stopOpacity={0.05} />
              </LinearGradient>
            </Defs>

            {/* Y-axis labels */}
            {showActualWeight && [0, 0.25, 0.5, 0.75, 1].map(percent => {
              const value = minMaxValues.min + (minMaxValues.max - minMaxValues.min) * (1 - percent);
              return (
                <SvgText
                  key={percent}
                  x={paddingHorizontal - 10}
                  y={paddingVertical + (graphHeight * percent)}
                  fontSize="10"
                  textAnchor="end"
                  fill="#666"
                >
                  {value.toFixed(1)}
                </SvgText>
              );
            })}

            {/* X-axis labels */}
            {dataPoints.length > 0 && [0, 0.25, 0.5, 0.75, 1].map(percent => {
              const index = Math.min(
                Math.floor(dataPoints.length * percent),
                dataPoints.length - 1
              );
              if (index >= 0) {
                const point = dataPoints[index];
                return (
                  <SvgText
                    key={percent}
                    x={point.x}
                    y={paddingVertical + graphHeight + 15}
                    fontSize="10"
                    textAnchor="end"
                    fill="#666"
                    rotation={-45}
                    originX={point.x}
                    originY={paddingVertical + graphHeight + 15}
                  >
                    {format(point.date, 'MM/dd')}
                  </SvgText>
                );
              }
              return null;
            })}

            {/* Horizontal grid lines */}
            {[0.25, 0.5, 0.75].map(percent => (
              <Line
                key={percent}
                x1={paddingHorizontal}
                y1={paddingVertical + (graphHeight * percent)}
                x2={paddingHorizontal + graphWidth}
                y2={paddingVertical + (graphHeight * percent)}
                stroke="#eee"
                strokeWidth={1}
              />
            ))}

            {/* Area under the line */}
            {dataPoints.length > 1 && (
              <Path
                d={`${pathData} L ${dataPoints[dataPoints.length-1].x} ${paddingVertical + graphHeight} L ${dataPoints[0].x} ${paddingVertical + graphHeight} Z`}
                fill="url(#gradient)"
              />
            )}

            {/* Projected path */}
            {projectedPathData && (
              <Path
                d={projectedPathData}
                stroke={trendColor}
                strokeWidth={2}
                strokeDasharray="5,5"
                fill="none"
              />
            )}

            {/* Weight line */}
            <Path
              d={pathData}
              fill="none"
              stroke={trendColor}
              strokeWidth={3}
            />

            {/* Data points */}
            {dataPoints.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={index === dataPoints.length - 1 ? trendColor : 'white'}
                stroke={trendColor}
                strokeWidth={2}
              />
            ))}

            {/* Goal line with label */}
            {weightGoal && weightGoal.target_weight && weightGoal.target_date && selectedTimeRange === 'goal' && (
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
                {/* White background rectangle for text */}
                <Rect
                  x={paddingHorizontal + (graphWidth * 0.05) - 10}
                  y={paddingVertical + graphHeight - ((weightGoal.target_weight - minMaxValues.min) / (minMaxValues.max - minMaxValues.min) * graphHeight) - 8}
                  width={40}
                  height={16}
                  fill="white"
                />
                {/* Goal text */}
                <SvgText
                  x={paddingHorizontal + (graphWidth * 0.05)}
                  y={paddingVertical + graphHeight - ((weightGoal.target_weight - minMaxValues.min) / (minMaxValues.max - minMaxValues.min) * graphHeight) + 4}
                  fontSize="10"
                  fill="#999"
                >
                  Goal
                </SvgText>
              </>
            )}
          </Svg>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Change</Text>
            <Text style={[styles.statValue, { color: trendColor }]}>
              {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} lbs
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Weekly Avg</Text>
            <Text style={[styles.statValue, { color: trendColor }]}>
              {avgChangePerWeek > 0 ? '+' : ''}{avgChangePerWeek.toFixed(1)} lbs
            </Text>
          </View>

          {weightGoal && weightGoal.target_weight && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>To Goal</Text>
              <Text style={styles.statValue}>
                {Math.abs(lastLog.weight_value - weightGoal.target_weight).toFixed(1)} lbs
              </Text>
            </View>
          )}
        </View>

        {renderTimeRangeSelector()}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  graphContainer: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  timeRangeButton: {
    marginHorizontal: 2,
    marginBottom: 8,
  },
  timeRangeButtonLabel: {
    fontSize: 12,
  },
  errorContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  noDataContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataIcon: {
    marginBottom: 12,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  skeletonButton: {
    marginHorizontal: 4,
    borderRadius: 4,
  },
});

export default WeightTrendGraph;