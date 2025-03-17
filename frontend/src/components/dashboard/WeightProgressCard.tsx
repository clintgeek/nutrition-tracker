import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../../types/navigation';
import { weightService } from '../../services/weightService';
import { SkeletonLoader } from '../common';
import WeightMetricsCard from './WeightMetricsCard';

interface WeightProgressCardProps {
  showActualWeight?: boolean;
  weightGoal?: any;
  weightLogs?: any[];
}

const WeightProgressCard: React.FC<WeightProgressCardProps> = ({
  showActualWeight = false,
  weightGoal: propWeightGoal = null,
  weightLogs: propWeightLogs = []
}) => {
  const theme = useTheme();
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weightData, setWeightData] = useState({
    currentWeight: 0,
    startWeight: 0,
    targetWeight: 0,
    totalChange: 0,
    percentComplete: 0,
    daysRemaining: 0,
    streak: 0,
    isGain: false,
  });
  const [localWeightGoal, setLocalWeightGoal] = useState<any>(null);
  const [localWeightLogs, setLocalWeightLogs] = useState<any[]>([]);

  useEffect(() => {
    if (propWeightGoal && propWeightLogs.length > 0) {
      setLocalWeightGoal(propWeightGoal);
      setLocalWeightLogs(propWeightLogs);
      processWeightData(propWeightGoal, propWeightLogs);
    } else {
      loadWeightData();
    }
  }, [propWeightGoal, propWeightLogs]);

  const loadWeightData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get weight goal
      const weightGoal = await weightService.getWeightGoal();
      if (!weightGoal) {
        setIsLoading(false);
        return;
      }

      // Get all weight logs to calculate streak
      const weightLogs = await weightService.getWeightLogs();
      const streak = weightLogs.length > 0 ? Math.min(weightLogs.length, 7) : 0;

      setLocalWeightGoal(weightGoal);
      setLocalWeightLogs(weightLogs);

      processWeightData(weightGoal, weightLogs, streak);
    } catch (err) {
      console.error('Error loading weight data:', err);
      setError('Failed to load weight data');
      setIsLoading(false);
    }
  };

  const processWeightData = (weightGoal: any, weightLogs: any[], streak: number = 0) => {
    try {
      // If no logs, use start weight as current
      const currentWeight = weightLogs.length > 0
        ? parseFloat(weightLogs[0].weight_value.toString())
        : parseFloat(weightGoal.start_weight.toString());

      const startWeight = parseFloat(weightGoal.start_weight.toString());
      const targetWeight = parseFloat(weightGoal.target_weight.toString());

      // Calculate if this is a weight gain or loss goal
      const isGain = targetWeight > startWeight;

      // Calculate total change so far
      const totalChange = startWeight - currentWeight;

      // Calculate percent complete
      const totalToLose = Math.abs(targetWeight - startWeight);
      const amountLost = Math.abs(currentWeight - startWeight);
      const percentComplete = totalToLose > 0 ? Math.min(100, Math.round((amountLost / totalToLose) * 100)) : 0;

      // Calculate days remaining (if target date exists)
      let daysRemaining = 0;
      if (weightGoal.target_date) {
        const today = new Date();
        const targetDate = new Date(weightGoal.target_date);
        const diffTime = targetDate.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining);
      }

      setWeightData({
        currentWeight,
        startWeight,
        targetWeight,
        totalChange,
        percentComplete,
        daysRemaining,
        streak: streak || (weightLogs.length > 0 ? Math.min(weightLogs.length, 7) : 0),
        isGain
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Error processing weight data:', err);
      setError('Failed to process weight data');
      setIsLoading(false);
    }
  };

  const navigateToWeightGoals = () => {
    navigation.navigate('GoalsStack', { screen: 'WeightGoals' });
  };

  const formatWeight = (weight: number) => {
    return weight.toFixed(1);
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <SkeletonLoader width={150} height={24} style={styles.skeletonTitle} />
            <SkeletonLoader width={24} height={24} style={styles.skeletonIcon} />
          </View>
          <SkeletonLoader width="100%" height={20} style={styles.skeletonBar} />
          <View style={styles.skeletonStatsRow}>
            <SkeletonLoader width="45%" height={18} />
            <SkeletonLoader width="45%" height={18} />
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Weight Progress</Title>
          <Text style={styles.errorText}>{error}</Text>
        </Card.Content>
      </Card>
    );
  }

  // If no weight goal or logs exist
  if (weightData.currentWeight === 0 && weightData.targetWeight === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Weight Progress</Title>
          <Text style={styles.noDataText}>No weight goal set</Text>
          <TouchableOpacity onPress={navigateToWeightGoals}>
            <Text style={styles.actionText}>Set a weight goal</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  }

  // Determine if progress is positive (moving towards goal) or negative (moving away from goal)
  const isPositiveProgress = weightData.isGain
    ? (weightData.currentWeight > weightData.startWeight) // For weight gain goals
    : (weightData.currentWeight < weightData.startWeight); // For weight loss goals

  // Always use green for positive progress, red for negative progress
  const progressColor = isPositiveProgress ? theme.colors.primary : theme.colors.error;

  // Calculate remaining weight to goal
  const remainingWeight = Math.abs(weightData.targetWeight - weightData.currentWeight);

  // Create descriptive change text
  const changeText = weightData.isGain
    ? `${formatWeight(weightData.totalChange)} lbs gained`
    : `${formatWeight(weightData.totalChange)} lbs lost`;

  const progressText = `${Math.round(weightData.percentComplete)}% to goal`;

  return (
    <TouchableOpacity onPress={navigateToWeightGoals} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.title}>Weight Progress</Title>
            <MaterialCommunityIcons
              name={weightData.isGain ? "trending-up" : "trending-down"}
              size={24}
              color={progressColor}
            />
          </View>

          {/* Progress bar */}
          <ProgressBar
            progress={weightData.percentComplete / 100}
            color={progressColor}
            style={styles.progressBar}
            testID="progress-bar"
          />

          {/* New stats row with 3 columns */}
          <View style={styles.threeStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.abs(weightData.totalChange).toFixed(1)} lbs</Text>
              <Text style={styles.statLabel}>{weightData.totalChange > 0 ? 'Lost' : 'Gained'}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weightData.percentComplete}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weightData.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>
                {formatWeight(remainingWeight)} lbs
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[styles.statValue, { color: progressColor }]}>
                {isPositiveProgress ? "On Track" : "Off Track"}
              </Text>
            </View>
          </View>

          {/* Summary line - right aligned */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {formatWeight(Math.abs(weightData.totalChange))} lbs {weightData.isGain ? 'gained' : 'lost'}, {formatWeight(remainingWeight)} lbs to go
            </Text>
          </View>

          {/* Show actual weights if enabled */}
          {showActualWeight && (
            <View style={styles.weightsRow}>
              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Current</Text>
                <Text style={styles.weightValue}>
                  {formatWeight(weightData.currentWeight)}
                </Text>
              </View>

              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Start</Text>
                <Text style={styles.weightValue}>
                  {formatWeight(weightData.startWeight)}
                </Text>
              </View>

              <View style={styles.weightItem}>
                <Text style={styles.weightLabel}>Target</Text>
                <Text style={styles.weightValue}>
                  {formatWeight(weightData.targetWeight)}
                </Text>
              </View>
            </View>
          )}

          {/* Days remaining */}
          {weightData.daysRemaining > 0 && (
            <Text style={styles.daysText}>
              {weightData.daysRemaining} days to target date
            </Text>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  weightItem: {
    flex: 1,
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  weightValue: {
    fontSize: 14,
  },
  daysText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 12,
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 12,
    color: '#666',
  },
  actionText: {
    textAlign: 'center',
    color: '#2196F3',
    marginTop: 8,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonIcon: {
    borderRadius: 12,
  },
  skeletonBar: {
    marginBottom: 16,
    borderRadius: 4,
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    position: 'relative',
    zIndex: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
    height: '80%',
    alignSelf: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    position: 'relative',
    zIndex: 2,
  },
  summaryContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  summaryText: {
    fontSize: 12,
    color: '#666',
  },
});

export default WeightProgressCard;