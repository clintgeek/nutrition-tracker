import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { differenceInDays, subDays } from 'date-fns';
import { SkeletonLoader } from '../common';

interface WeightMetricsCardProps {
  weightGoal: any;
  weightLogs: any[];
  isLoading?: boolean;
}

const WeightMetricsCard: React.FC<WeightMetricsCardProps> = ({
  weightGoal,
  weightLogs,
  isLoading = false
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={styles.metricsContainer}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={styles.metricItem}>
            <SkeletonLoader width={40} height={40} style={styles.iconSkeleton} />
            <SkeletonLoader width={80} height={20} style={styles.textSkeleton} />
            <SkeletonLoader width={60} height={24} style={styles.valueSkeleton} />
          </View>
        ))}
      </View>
    );
  }

  // If no goal or logs, show placeholder
  if (!weightGoal || weightLogs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Set a weight goal and log your weight to see metrics
        </Text>
      </View>
    );
  }

  // Calculate metrics
  const latestLog = weightLogs[0]; // Assuming logs are sorted newest first
  const oldestLog = weightLogs[weightLogs.length - 1];

  // Total weight change since goal start
  const totalChange = latestLog.weight_value - weightGoal.start_weight;
  const isGain = weightGoal.target_weight > weightGoal.start_weight;
  const isPositiveProgress = (isGain && totalChange > 0) || (!isGain && totalChange < 0);

  // Progress percentage
  const totalGoalChange = weightGoal.target_weight - weightGoal.start_weight;
  const progressPercent = Math.min(
    100,
    Math.abs(totalChange / totalGoalChange * 100) || 0
  );

  // Days elapsed
  const today = new Date();
  const startDate = new Date(weightGoal.start_date);
  const daysElapsed = Math.max(1, differenceInDays(today, startDate));

  // Weekly average change
  const weeklyAverage = (totalChange / (daysElapsed / 7)).toFixed(1);

  // This week's change
  const oneWeekAgo = subDays(today, 7);
  let thisWeekChange = 0;

  // Find the log closest to one week ago
  const oneWeekAgoLogs = weightLogs.filter(log =>
    new Date(log.log_date) >= oneWeekAgo
  );

  if (oneWeekAgoLogs.length > 0) {
    // If we have logs within the last week, calculate the change
    const oldestThisWeek = oneWeekAgoLogs[oneWeekAgoLogs.length - 1];
    thisWeekChange = latestLog.weight_value - oldestThisWeek.weight_value;
  } else if (weightLogs.length > 1) {
    // If no logs in the last week but we have multiple logs, use the most recent change
    thisWeekChange = latestLog.weight_value - weightLogs[1].weight_value;
  }

  return (
    <View style={styles.metricsContainer}>
      {/* Progress Percentage */}
      <View style={styles.metricItem}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="percent" size={24} color="white" />
        </View>
        <Text style={styles.metricLabel}>Progress</Text>
        <Text style={styles.metricValue}>{progressPercent.toFixed(0)}%</Text>
      </View>

      {/* Total Lost/Gained since goal start */}
      <View style={styles.metricItem}>
        <View style={[styles.iconContainer, {
          backgroundColor: isPositiveProgress ? theme.colors.primary : theme.colors.error
        }]}>
          <MaterialCommunityIcons
            name={isGain ? "scale-balance" : "weight"}
            size={24}
            color="white"
          />
        </View>
        <Text style={styles.metricLabel}>Total</Text>
        <Text style={styles.metricValue}>
          {Math.abs(totalChange).toFixed(1)}
        </Text>
      </View>

      {/* This Week's Change */}
      <View style={styles.metricItem}>
        <View style={[styles.iconContainer, {
          backgroundColor: (isGain && thisWeekChange > 0) || (!isGain && thisWeekChange < 0)
            ? theme.colors.primary
            : theme.colors.error
        }]}>
          <MaterialCommunityIcons
            name="calendar-week"
            size={24}
            color="white"
          />
        </View>
        <Text style={styles.metricLabel}>This Week</Text>
        <Text style={styles.metricValue}>
          {Math.abs(thisWeekChange).toFixed(1)}
        </Text>
      </View>

      {/* Weekly Average */}
      <View style={styles.metricItem}>
        <View style={[styles.iconContainer, {
          backgroundColor: isPositiveProgress ? theme.colors.primary : theme.colors.error
        }]}>
          <MaterialCommunityIcons
            name={isGain ? "trending-up" : "trending-down"}
            size={24}
            color="white"
          />
        </View>
        <Text style={styles.metricLabel}>Average</Text>
        <Text style={styles.metricValue}>
          {Math.abs(parseFloat(weeklyAverage)).toFixed(1)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metricItem: {
    alignItems: 'center',
    width: '25%',
    padding: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  iconSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  textSkeleton: {
    marginBottom: 4,
    borderRadius: 4,
  },
  valueSkeleton: {
    borderRadius: 4,
  },
});

export default WeightMetricsCard;