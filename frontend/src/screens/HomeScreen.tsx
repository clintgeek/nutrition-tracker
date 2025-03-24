import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

// Import components
import TodaySummary from '../components/home/TodaySummary';
import MealPlanCard from '../components/home/MealPlanCard';
import { WeightProgressCard, WeightMiniGraph, WeightMetricsCard } from '../components/dashboard';
import { weightService } from '../services/weightService';
import { logService } from '../services/logService';
import { SkeletonLoader } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { setAuthToken } from '../services/apiService';

// Remove the storage key for weight display preference
// const SHOW_WEIGHT_VALUES_KEY = 'showWeightValuesOnDashboard';

type Props = RootStackScreenProps<'Main'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { token } = useAuth();
  // Remove the state for showing weight values
  // const [showWeightValues, setShowWeightValues] = useState(false);
  const [weightStats, setWeightStats] = useState({
    totalLost: 0,
    percentComplete: 0,
    currentStreak: 0,
    hasMultipleLogs: false,
    hasWeightGoal: false,
    weightGoal: null,
    weightLogs: []
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tipOfTheDay, setTipOfTheDay] = useState('');

  // Set token when it changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Load user preference and data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Ensure we have a token
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Load weight data
        const weightGoal = await weightService.getWeightGoal();
        const weightLogs = await weightService.getWeightLogs();

        // Calculate stats
        if (weightGoal && weightLogs.length > 0) {
          const startWeight = parseFloat(weightGoal.start_weight.toString());
          const targetWeight = parseFloat(weightGoal.target_weight.toString());
          const currentWeight = parseFloat(weightLogs[0].weight_value.toString());
          const totalLost = startWeight - currentWeight;

          // Calculate percent complete
          const totalToLose = Math.abs(targetWeight - startWeight);
          const amountLost = Math.abs(currentWeight - startWeight);
          const percentComplete = totalToLose > 0 ? Math.min(100, Math.round((amountLost / totalToLose) * 100)) : 0;

          // Check if multiple logs exist
          const hasMultipleLogs = weightLogs.length > 1;

          setWeightStats({
            totalLost,
            percentComplete,
            currentStreak: calculateStreak(weightLogs),
            hasMultipleLogs,
            hasWeightGoal: true,
            weightGoal,
            weightLogs
          });
        }

        // Load recent food logs
        try {
          const recentFoodLogs = await logService.getRecentLogs(5);
          setRecentLogs(recentFoodLogs || []);
        } catch (error) {
          setRecentLogs([]);
        }

        // Set tip of the day
        setTipOfTheDay(getTipOfTheDay());

      } catch (error) {
        // Minimal error logging
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  // Calculate logging streak (simplified implementation)
  const calculateStreak = (logs: any[]) => {
    return logs.length > 0 ? Math.min(logs.length, 7) : 0;
  };

  // Get a random tip of the day
  const getTipOfTheDay = () => {
    const tips = [
      "Consistency is key! Try to log your weight at the same time each day for the most accurate tracking.",
      "Drinking water before meals can help reduce overall calorie intake.",
      "Focus on progress, not perfection. Small, consistent changes lead to lasting results.",
      "Adding strength training to your routine helps build muscle, which burns more calories at rest.",
      "Getting enough sleep is crucial for weight management and overall health.",
      "Try to eat slowly and mindfully to better recognize when you're full.",
      "Planning meals ahead of time can help you make healthier choices.",
      "Remember that weight fluctuates naturally day to day. Look for trends over weeks, not days."
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  };

  const navigateToWeightGoals = () => {
    navigation.navigate('MainTabs', {
      screen: 'WeightGoals'
    });
  };

  const navigateToFoodLog = () => {
    navigation.navigate('Log');
  };

  // Format date for recent logs
  const formatLogDate = (dateString: string) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return format(date, 'MMM d');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Today's Summary */}
        <TouchableOpacity onPress={navigateToFoodLog} activeOpacity={0.7}>
          <TodaySummary />
        </TouchableOpacity>

        {/* Weight Progress Section with Context */}
        <TouchableOpacity onPress={navigateToWeightGoals} activeOpacity={0.7}>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Weight Progress</Title>
              <WeightMetricsCard
                weightGoal={!isLoading && weightStats.weightGoal ? weightStats.weightGoal : null}
                weightLogs={!isLoading && weightStats.weightLogs ? weightStats.weightLogs : []}
                isLoading={isLoading}
              />
            </Card.Content>
          </Card>
        </TouchableOpacity>

        {/* Enhanced Weight Graph with Context */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Goal Weight Trend</Title>
            {isLoading ? (
              <SkeletonLoader width="100%" height={100} />
            ) : weightStats.hasMultipleLogs ? (
              <WeightMiniGraph />
            ) : (
              <View style={styles.noGraphContainer}>
                <MaterialCommunityIcons name="chart-line" size={40} color="#ccc" />
                <Text style={styles.noGraphText}>
                  {weightStats.weightLogs.length === 1
                    ? "Add one more weight log to see your trend graph"
                    : "Add weight logs to see your progress over time"}
                </Text>
                <Button
                  mode="contained"
                  onPress={navigateToWeightGoals}
                  style={styles.logButton}
                >
                  Log Weight
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Meal Plan Card */}
        <MealPlanCard />

        {/* Recent Activity Section */}
        <View style={styles.activitySection}>
          {isLoading ? (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Recent Activity</Title>
                <SkeletonLoader width="100%" height={24} style={styles.skeletonItem} />
                <SkeletonLoader width="100%" height={24} style={styles.skeletonItem} />
                <SkeletonLoader width="100%" height={24} style={styles.skeletonItem} />
              </Card.Content>
            </Card>
          ) : recentLogs.length > 0 ? (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <Title style={styles.sectionTitle}>Recent Activity</Title>
                  <TouchableOpacity onPress={navigateToFoodLog}>
                    <Text style={styles.seeAllLink}>See All</Text>
                  </TouchableOpacity>
                </View>
                {recentLogs.map((log, index) => (
                  <React.Fragment key={log.id || index}>
                    <View style={styles.activityItem}>
                      <MaterialCommunityIcons
                        name="food-apple"
                        size={24}
                        color={theme.colors.primary}
                      />
                      <View style={styles.activityDetails}>
                        <Text style={styles.activityName}>{log.food_name || 'Food item'}</Text>
                        <Text style={styles.activityTime}>{formatLogDate(log.created_at)}</Text>
                      </View>
                      <Text style={styles.activityCalories}>
                        {(() => {
                          let calories = 0;
                          if (log.calories_per_serving && log.servings) {
                            calories = log.calories_per_serving * log.servings;
                          } else if (log.calories) {
                            calories = log.calories;
                          } else if (log.total_calories) {
                            calories = log.total_calories;
                          }
                          return Math.round(calories) || 0;
                        })()} cal
                      </Text>
                    </View>
                    {index < recentLogs.length - 1 && <Divider style={styles.activityDivider} />}
                  </React.Fragment>
                ))}
              </Card.Content>
            </Card>
          ) : (
            <Card style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Recent Activity</Title>
                <View style={styles.emptyContent}>
                  <MaterialCommunityIcons name="food" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No recent food logs</Text>
                  <Button
                    mode="contained"
                    onPress={navigateToFoodLog}
                    style={styles.logButton}
                  >
                    Log Food
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Motivational Tips Section */}
        {/* <Card style={styles.tipsCard}>
          <Card.Content>
            <View style={styles.tipHeader}>
              <MaterialCommunityIcons name="lightbulb-on" size={24} color="#FFD700" />
              <Text style={styles.tipTitle}>Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>{tipOfTheDay}</Text>
          </Card.Content>
        </Card> */}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  seeAllLink: {
    color: '#2196F3',
    fontWeight: '500',
  },
  noGraphContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noGraphText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 12,
  },
  logButton: {
    marginTop: 8,
  },
  activitySection: {
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityDetails: {
    flex: 1,
    marginLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  activityCalories: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityDivider: {
    backgroundColor: '#f0f0f0',
  },
  emptyCard: {
    marginVertical: 8,
    elevation: 2,
    borderRadius: 8,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
  skeletonItem: {
    marginVertical: 8,
    borderRadius: 4,
  },
});

export default HomeScreen;
