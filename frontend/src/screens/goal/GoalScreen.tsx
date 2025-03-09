import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  ProgressBar,
  Divider,
  useTheme,
  ActivityIndicator,
  FAB
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

import { goalService } from '../../services/goalService';
import { foodLogService } from '../../services/foodLogService';
import { Goal, GoalProgress } from '../../types/Goal';
import { getLastNDays, formatDate } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';

const screenWidth = Dimensions.get('window').width;

const GoalScreen: React.FC = () => {
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progressData, setProgressData] = useState<GoalProgress[]>([]);
  const [todayProgress, setTodayProgress] = useState<GoalProgress | null>(null);

  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const fetchGoalData = async () => {
    try {
      setIsLoading(true);

      // Fetch current goal
      const goal = await goalService.getCurrentGoal();
      setCurrentGoal(goal);

      if (goal) {
        // Get last 7 days for progress chart
        const last7Days = getLastNDays(7);
        const startDate = last7Days[0].date;
        const endDate = last7Days[last7Days.length - 1].date;

        // Fetch log summary for date range
        const logSummary = await foodLogService.getLogSummary(startDate, endDate);

        // Create progress data for each day
        const progressByDay = last7Days.map(day => {
          const dayLogs = logSummary.logs_by_date[day.date] || [];
          const daySummary = logSummary.summaries[day.date] || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0
          };

          return {
            date: day.date,
            caloriesConsumed: daySummary.calories,
            proteinConsumed: daySummary.protein,
            carbsConsumed: daySummary.carbs,
            fatConsumed: daySummary.fat,
            caloriesGoal: goal.daily_calorie_target,
            proteinGoal: goal.protein_target_grams,
            carbsGoal: goal.carbs_target_grams,
            fatGoal: goal.fat_target_grams,
            caloriesPercentage: Math.min(daySummary.calories / goal.daily_calorie_target, 1) * 100,
            proteinPercentage: Math.min(daySummary.protein / goal.protein_target_grams, 1) * 100,
            carbsPercentage: Math.min(daySummary.carbs / goal.carbs_target_grams, 1) * 100,
            fatPercentage: Math.min(daySummary.fat / goal.fat_target_grams, 1) * 100
          };
        });

        setProgressData(progressByDay);
        setTodayProgress(progressByDay[progressByDay.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching goal data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoalData();
    }, [])
  );

  const navigateToSetGoal = () => {
    navigation.navigate('SetGoal', { currentGoal });
  };

  const renderProgressBar = (
    label: string,
    consumed: number,
    goal: number,
    color: string,
    unit: string
  ) => {
    const percentage = Math.min(consumed / goal, 1);
    const formattedConsumed = Math.round(consumed);
    const formattedGoal = Math.round(goal);

    return (
      <View style={styles.progressItem}>
        <View style={styles.progressLabelContainer}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>
            {formattedConsumed} / {formattedGoal} {unit}
          </Text>
        </View>
        <ProgressBar
          progress={percentage}
          color={color}
          style={styles.progressBar}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your goals...</Text>
      </View>
    );
  }

  if (!currentGoal) {
    return (
      <EmptyState
        icon="flag-outline"
        title="No Goal Set"
        message="You haven't set any nutrition goals yet. Set a goal to track your progress."
        actionLabel="Set Goal"
        onAction={navigateToSetGoal}
      />
    );
  }

  // Calculate progress percentages
  const caloriePercentage = todayProgress ? todayProgress.caloriesPercentage : 0;
  const proteinPercentage = todayProgress ? todayProgress.proteinPercentage : 0;
  const carbsPercentage = todayProgress ? todayProgress.carbsPercentage : 0;
  const fatPercentage = todayProgress ? todayProgress.fatPercentage : 0;

  // Format dates for display
  const startDate = currentGoal.start_date ? formatDate(new Date(currentGoal.start_date)) : 'Not set';
  const endDate = currentGoal.end_date ? formatDate(new Date(currentGoal.end_date)) : 'Not set';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.goalCard}>
        <Card.Content>
          <Title style={styles.cardTitle}>Current Nutrition Goals</Title>
          <Paragraph style={styles.goalDate}>
            Started on {startDate}
          </Paragraph>

          <View style={styles.goalValues}>
            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{Math.round(currentGoal.calories)}</Text>
              <Text style={styles.goalLabel}>Calories</Text>
            </View>

            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{Math.round(currentGoal.protein)}g</Text>
              <Text style={styles.goalLabel}>Protein</Text>
            </View>

            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{Math.round(currentGoal.carbs)}g</Text>
              <Text style={styles.goalLabel}>Carbs</Text>
            </View>

            <View style={styles.goalItem}>
              <Text style={styles.goalValue}>{Math.round(currentGoal.fat)}g</Text>
              <Text style={styles.goalLabel}>Fat</Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={navigateToSetGoal}
            style={styles.updateButton}
          >
            Update Goals
          </Button>
        </Card.Content>
      </Card>

      {todayProgress && (
        <Card style={styles.progressCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Today's Progress</Title>

            {renderProgressBar(
              'Calories',
              todayProgress.caloriesConsumed,
              todayProgress.caloriesGoal,
              theme.colors.primary,
              'kcal'
            )}

            {renderProgressBar(
              'Protein',
              todayProgress.proteinConsumed,
              todayProgress.proteinGoal,
              '#4CAF50',
              'g'
            )}

            {renderProgressBar(
              'Carbs',
              todayProgress.carbsConsumed,
              todayProgress.carbsGoal,
              '#2196F3',
              'g'
            )}

            {renderProgressBar(
              'Fat',
              todayProgress.fatConsumed,
              todayProgress.fatGoal,
              '#FF9800',
              'g'
            )}
          </Card.Content>
        </Card>
      )}

      {progressData.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Weekly Progress</Title>

            <Text style={styles.chartTitle}>Calories</Text>
            <LineChart
              data={{
                labels: progressData.map(day => day.date.split('-')[2]), // Day of month
                datasets: [
                  {
                    data: progressData.map(day => day.caloriesConsumed),
                    color: () => theme.colors.primary,
                    strokeWidth: 2
                  },
                  {
                    data: progressData.map(day => day.caloriesGoal),
                    color: () => 'rgba(0, 0, 0, 0.3)',
                    strokeWidth: 1,
                    strokeDashArray: [5, 5]
                  }
                ]
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: {
                  borderRadius: 16
                },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: theme.colors.primary
                }
              }}
              bezier
              style={styles.chart}
            />

            <Divider style={styles.divider} />

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.legendText}>Consumed</Text>
              </View>

              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: 'rgba(0, 0, 0, 0.3)' }]} />
                <Text style={styles.legendText}>Goal</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="pencil"
        onPress={navigateToSetGoal}
        color="white"
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  goalCard: {
    margin: 16,
    marginBottom: 8,
  },
  progressCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  chartCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 80,
  },
  cardTitle: {
    marginBottom: 16,
  },
  goalDate: {
    color: '#757575',
    marginBottom: 16,
  },
  goalValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalItem: {
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  goalLabel: {
    fontSize: 12,
    color: '#757575',
  },
  updateButton: {
    marginTop: 8,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontWeight: 'bold',
  },
  progressValue: {
    color: '#757575',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  divider: {
    marginVertical: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#757575',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default GoalScreen;