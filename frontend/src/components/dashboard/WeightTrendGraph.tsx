import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform, Alert } from 'react-native';
import { Card, Text, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { weightService } from '../../services/weightService';
import { SkeletonLoader } from '../common';
import { format, subDays, subMonths, differenceInDays } from 'date-fns';
import NivoWeightChart from '../weight/NivoWeightChart';

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
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

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
    } catch (err) {
      console.error('Error loading weight data for graph:', err);
      setError('Failed to load weight data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeRangeSelector = () => {
    const timeRanges = [
      { id: 'week', label: '7D' },
      { id: 'month', label: '1M' },
      { id: '3months', label: '3M' },
      { id: 'year', label: '1Y' },
      { id: 'goal', label: 'Goal' },
    ];

    return (
      <View style={styles.timeSelector}>
        {timeRanges.map((range) => (
          <TouchableOpacity
            key={range.id}
            style={[
              styles.timeButton,
              selectedTimeRange === range.id && styles.timeButtonActive
            ]}
            onPress={() => setSelectedTimeRange(range.id as "week" | "month" | "3months" | "year" | "goal")}
          >
            <Text style={[
              styles.timeText,
              selectedTimeRange === range.id && styles.timeTextActive
            ]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <SkeletonLoader height={250} width="100%" />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Content style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={36} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={loadWeightData} mode="contained" style={{ marginTop: 16 }}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (weightLogs.length === 0) {
    return (
      <Card>
        <Card.Content style={styles.errorContainer}>
          <MaterialCommunityIcons name="scale-bathroom" size={36} color="#888" />
          <Text style={{ textAlign: 'center', marginTop: 8 }}>No weight logs found</Text>
          <Text style={{ textAlign: 'center', color: '#888', marginTop: 4 }}>
            Add weight logs to see your trends
          </Text>
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
          <NivoWeightChart
            logs={weightLogs}
            timeSpan={selectedTimeRange}
            startWeight={weightGoal?.start_weight}
            targetWeight={weightGoal?.target_weight}
          />
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

          {Platform.OS === 'web' && weightLogs.length > 0 && (
            <TouchableOpacity
              style={styles.exportButton}
              onPress={async () => {
                try {
                  // Get date range based on current timeRange
                  const now = new Date();
                  let startDate: string | undefined;

                  switch (selectedTimeRange) {
                    case 'week':
                      startDate = format(subDays(now, 7), 'yyyy-MM-dd');
                      break;
                    case 'month':
                      startDate = format(subDays(now, 30), 'yyyy-MM-dd');
                      break;
                    case '3months':
                      startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
                      break;
                    case 'year':
                      startDate = format(subMonths(now, 12), 'yyyy-MM-dd');
                      break;
                    case 'goal':
                      if (weightGoal && weightGoal.start_date) {
                        startDate = format(new Date(weightGoal.start_date), 'yyyy-MM-dd');
                      } else {
                        startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
                      }
                      break;
                  }

                  const endDate = format(now, 'yyyy-MM-dd');

                  // Generate PDF report
                  const blob = await weightService.generateReport(startDate, endDate, selectedTimeRange);

                  // Download the PDF
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = `weight-report-${selectedTimeRange}-${format(now, 'yyyy-MM-dd')}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);

                  Alert.alert('Success', 'Weight report generated successfully');
                } catch (error) {
                  console.error('Error generating PDF report:', error);
                  Alert.alert('Error', 'Failed to generate weight report');
                }
              }}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.exportButtonText}>Export PDF</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
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
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  timeButton: {
    marginHorizontal: 2,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  timeButtonActive: {
    backgroundColor: '#4285F4',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  timeTextActive: {
    fontWeight: 'bold',
    color: '#fff',
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
  exportButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WeightTrendGraph;