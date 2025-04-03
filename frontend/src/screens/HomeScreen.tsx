import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, useTheme, Divider, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

// Import components
import TodaySummary from '../components/home/TodaySummary';
import MealPlanCard from '../components/home/MealPlanCard';
import HomeScreenEditor from '../components/home/HomeScreenEditor';
import { FitnessSummaryCard } from '../components/home';
import type { HomeScreenCard } from '../components/home/HomeScreenEditor';
import { WeightProgressCard, WeightMiniGraph, WeightMetricsCard } from '../components/dashboard';
import { weightService } from '../services/weightService';
import { logService } from '../services/logService';
import { foodLogService, FoodLog } from '../services/foodLogService';
import { SkeletonLoader } from '../components/common';
import { useAuth } from '../contexts/AuthContext';
import { setAuthToken } from '../services/apiService';
import { userPreferencesService } from '../services/userPreferencesService';
import { fitnessService, GarminDailySummary } from '../services/fitnessService';

// Remove the storage key for weight display preference
// const SHOW_WEIGHT_VALUES_KEY = 'showWeightValuesOnDashboard';

type Props = RootStackScreenProps<'Main'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { token } = useAuth();
  // Remove the state for showing weight values
  // const [showWeightValues, setShowWeightValues] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cardLayout, setCardLayout] = useState<HomeScreenCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weightStats, setWeightStats] = useState({
    totalLost: 0,
    percentComplete: 0,
    currentStreak: 0,
    hasMultipleLogs: false,
    hasWeightGoal: false,
    weightGoal: null as any,
    weightLogs: [] as any[]
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [tipOfTheDay, setTipOfTheDay] = useState('');
  const [dailySummary, setDailySummary] = useState<GarminDailySummary | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{connected: boolean}>({connected: false});

  const DEFAULT_CARDS: HomeScreenCard[] = [
    { id: 'todaySummary', title: 'Today\'s Summary', enabled: true, order: 0 },
    { id: 'weightProgress', title: 'Weight Progress', enabled: true, order: 1 },
    { id: 'weightTrend', title: 'Goal Weight Trend', enabled: true, order: 2 },
    { id: 'fitnessData', title: 'Fitness Activity', enabled: true, order: 3 },
    { id: 'mealPlan', title: 'Meal Plan', enabled: true, order: 4 },
    { id: 'recentActivity', title: 'Recent Activity', enabled: true, order: 5 },
  ];

  // Set token when it changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Load user preference and data
  // Define loadData outside useEffect so we can call it from the reset button
  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load card layout first
      await loadCardLayout();

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

      // Load fitness data
      try {
        // Check connection status first
        const status = await fitnessService.checkGarminConnectionStatus();
        setConnectionStatus(status);

        if (status.connected) {
          // Get today's date in YYYY-MM-DD format
          const today = new Date();
          const todayStr = format(today, 'yyyy-MM-dd');

          // Attempt to get today's summary
          const summary = await fitnessService.getGarminDailySummary(todayStr);
          setDailySummary(summary);
        }
      } catch (error) {
        console.error('Error fetching fitness data:', error);
      }

      // Load recent food logs
      try {
        // Use the original logService.getRecentLogs which was working before
        // but keep our improved calorie calculation
        const recentFoodLogs = await logService.getRecentLogs(5);
        setRecentLogs(recentFoodLogs || []);
      } catch (error) {
        console.error('Error fetching recent logs:', error);
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

  useEffect(() => {
    loadData();
  }, [token]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('HomeScreen focused, refreshing data');
      loadData();
    }, [])
  );

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

  const navigateToFitness = () => {
    navigation.navigate('Fitness' as never);
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

  const loadCardLayout = async () => {
    try {
      // Try to load from server first
      const serverLayout = await userPreferencesService.getHomeScreenLayout();
      if (serverLayout) {
        // Check if fitnessData card exists in the layout
        const hasfitnessData = serverLayout.some(card => card.id === 'fitnessData');

        if (!hasfitnessData) {
          // Add fitnessData to the layout if it doesn't exist
          const newLayout = [...serverLayout, {
            id: 'fitnessData' as const,
            title: 'Fitness Activity',
            enabled: true,
            order: serverLayout.length
          }];
          // Save the updated layout to server
          await userPreferencesService.updateHomeScreenLayout(newLayout);
          setCardLayout(newLayout);
          return;
        }

        setCardLayout(serverLayout);
        return;
      }

      // If no server layout, check local storage as fallback
      const savedLayout = await AsyncStorage.getItem('@home_screen_layout');
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);

        // Check if fitnessData card exists in the local layout
        const hasfitnessData = parsedLayout.some((card: HomeScreenCard) => card.id === 'fitnessData');

        if (!hasfitnessData) {
          // Add fitnessData to the layout if it doesn't exist
          const newLayout = [...parsedLayout, {
            id: 'fitnessData' as const,
            title: 'Fitness Activity',
            enabled: true,
            order: parsedLayout.length
          }];
          // Save the updated layout to server and local storage
          await userPreferencesService.updateHomeScreenLayout(newLayout);
          await AsyncStorage.setItem('@home_screen_layout', JSON.stringify(newLayout));
          setCardLayout(newLayout);
          return;
        }

        // Save to server for future use
        await userPreferencesService.updateHomeScreenLayout(parsedLayout);
        setCardLayout(parsedLayout);
      } else {
        // Set and save default layout
        await userPreferencesService.updateHomeScreenLayout(DEFAULT_CARDS);
        setCardLayout(DEFAULT_CARDS);
      }
    } catch (error) {
      console.error('Error loading card layout:', error);
      // Fallback to default layout on error
      setCardLayout(DEFAULT_CARDS);
    }
  };

  const handleSaveLayout = async (newLayout: HomeScreenCard[]) => {
    try {
      // Save to server
      await userPreferencesService.updateHomeScreenLayout(newLayout);
      // Update local state
      setCardLayout(newLayout);
      setIsEditing(false);

      // Also update local storage as backup
      await AsyncStorage.setItem('@home_screen_layout', JSON.stringify(newLayout));
    } catch (error) {
      console.error('Error saving layout:', error);
      // If server save fails, at least try local storage
      await AsyncStorage.setItem('@home_screen_layout', JSON.stringify(newLayout));
      setCardLayout(newLayout);
      setIsEditing(false);
    }
  };

  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'todaySummary':
        return (
          <TouchableOpacity onPress={navigateToFoodLog} activeOpacity={0.7}>
            <TodaySummary />
          </TouchableOpacity>
        );
      case 'weightProgress':
        return (
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
        );
      case 'weightTrend':
        return (
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
        );
      case 'fitnessData':
        return (
          <TouchableOpacity onPress={navigateToFitness} activeOpacity={0.7}>
            <FitnessSummaryCard
              fitnessSummary={dailySummary}
              isLoading={isLoading}
            />
          </TouchableOpacity>
        );
      case 'mealPlan':
        return <MealPlanCard />;
      case 'recentActivity':
        return (
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
                            // Extract the correct calories value from the log

                            // Check if we have a food item from the LogScreen format
                            if (log.calories_per_serving !== undefined && log.calories_per_serving !== null) {
                              // This is from logService
                              const servings = parseFloat(log.servings?.toString() || "1");
                              return Math.round(log.calories_per_serving * servings) + " cal";
                            }

                            // Check alternate format (calories_per_serving vs caloriesPerServing)
                            if (log.caloriesPerServing !== undefined && log.caloriesPerServing !== null) {
                              const servings = parseFloat(log.servings?.toString() || "1");
                              return Math.round(log.caloriesPerServing * servings) + " cal";
                            }

                            // Check for protein_grams format (from LogScreen)
                            if (log.protein_grams !== undefined) {
                              // This log came from the foodLogService format
                              if (log.calories_per_serving) {
                                return Math.round(log.calories_per_serving) + " cal";
                              }
                            }

                            // Check for direct calories field
                            if (log.calories) {
                              return Math.round(log.calories) + " cal";
                            }

                            // Last resort - total calories
                            if (log.total_calories) {
                              return Math.round(log.total_calories) + " cal";
                            }

                            // No valid calorie data found
                            return "--- cal";
                          })()}
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
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {cardLayout
            .filter(card => card.enabled)
            .sort((a, b) => a.order - b.order)
            .map(card => (
              <View key={card.id}>
                {renderCard(card.id)}
              </View>
            ))}

          <View style={styles.editButtonContainer}>
            <Button
              mode="outlined"
              icon="cog"
              onPress={() => setIsEditing(true)}
              style={styles.editButton}
            >
              Edit Home Screen Layout
            </Button>
          </View>
        </View>
      </ScrollView>

      <HomeScreenEditor
        visible={isEditing}
        onDismiss={() => setIsEditing(false)}
        onSave={handleSaveLayout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
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
  editButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  editButton: {
    alignSelf: 'center',
  },
  editButtonContent: {
    flexDirection: 'row-reverse', // Puts icon after text
    paddingHorizontal: 16,
  },
});

export default HomeScreen;
