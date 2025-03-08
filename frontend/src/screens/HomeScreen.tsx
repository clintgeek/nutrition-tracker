import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, ActivityIndicator } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';

import { foodLogService } from '../services/foodLogService';
import { goalService } from '../services/goalService';
import { FoodLog } from '../types/FoodLog';
import { Goal } from '../types/Goal';
import NutritionSummaryCard from '../components/home/NutritionSummaryCard';
import RecentLogsCard from '../components/home/RecentLogsCard';
import GoalProgressCard from '../components/home/GoalProgressCard';

const HomeScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayLogs, setTodayLogs] = useState<FoodLog[]>([]);
  const [recentLogs, setRecentLogs] = useState<FoodLog[]>([]);
  const [goals, setGoals] = useState<Goal | null>(null);
  const [nutritionSummary, setNutritionSummary] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const theme = useTheme();
  const isFocused = useIsFocused();

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's logs
      const todayLogsData = await foodLogService.getFoodLogsByDate(today);
      setTodayLogs(todayLogsData);

      // Fetch recent logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentLogsData = await foodLogService.getFoodLogsByDateRange(
        sevenDaysAgo.toISOString().split('T')[0],
        today
      );
      setRecentLogs(recentLogsData);

      // Fetch user goals
      const userGoals = await goalService.getCurrentGoal();
      setGoals(userGoals);

      // Calculate nutrition summary from today's logs
      const summary = todayLogsData.reduce((acc, log) => {
        return {
          calories: acc.calories + (log.food.calories * log.servingSize),
          protein: acc.protein + (log.food.protein * log.servingSize),
          carbs: acc.carbs + (log.food.carbs * log.servingSize),
          fat: acc.fat + (log.food.fat * log.servingSize),
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setNutritionSummary(summary);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your nutrition data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.greeting}>Hello! Here's your nutrition summary</Text>

      <NutritionSummaryCard
        nutritionSummary={nutritionSummary}
        goals={goals}
      />

      <GoalProgressCard
        nutritionSummary={nutritionSummary}
        goals={goals}
      />

      <RecentLogsCard recentLogs={recentLogs} />

      <Card style={styles.tipsCard}>
        <Card.Content>
          <Title>Nutrition Tip</Title>
          <Paragraph>
            Try to include a variety of colorful vegetables in your meals to ensure you're getting a wide range of nutrients.
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tipsCard: {
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
  },
});

export default HomeScreen;