import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Title,
  Divider,
  Chip,
  Avatar,
  useTheme,
  Button,
  Portal,
  Dialog
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { foodLogService } from '../../services/foodLogService';
import { goalService } from '../../services/goalService';
import { fitnessService, GarminDailySummary, RefreshedSummaryResult } from '../../services/fitnessService';
import { FoodLog } from '../../services/foodLogService';
import { formatDate, getTodayDate } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonCard, LoadingOverlay } from '../../components/common';

type LogScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Log'>;

const LogScreen: React.FC = () => {
  const navigation = useNavigation<LogScreenNavigationProp>();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nutritionSummary, setNutritionSummary] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [calorieGoal, setCalorieGoal] = useState(2000); // Default value
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [dailySummary, setDailySummary] = useState<GarminDailySummary | null>(null);

  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    dateSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    calendarIcon: {
      marginLeft: 8,
    },
    summaryCard: {
      margin: 16,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    summaryContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryItem: {
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      color: '#757575',
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
    },
    mealList: {
      paddingBottom: 16,
    },
    mealCard: {
      margin: 16,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: theme.colors.surface,
    },
    logItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },
    foodInfo: {
      flex: 1,
    },
    foodName: {
      fontSize: 16,
      marginBottom: 4,
    },
    servingInfo: {
      fontSize: 12,
      color: '#757575',
    },
    nutritionInfo: {
      alignItems: 'flex-end',
    },
    calories: {
      fontWeight: 'bold',
    },
    macros: {
      fontSize: 12,
      color: '#757575',
    },
    emptyMeal: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    emptyMealText: {
      color: '#757575',
      marginBottom: 8,
    },
    addButton: {
      marginTop: 8,
    },
    deleteButton: {
      minWidth: 120,
      marginLeft: 8,
    },
    deleteDialogTitle: {
      textAlign: 'center',
      fontSize: 20,
      fontWeight: 'bold',
    },
    deleteDialogContent: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    deleteIcon: {
      marginBottom: 16,
    },
    deleteDialogText: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 8,
    },
    deleteDialogSubtext: {
      fontSize: 14,
      color: '#666',
      textAlign: 'center',
    },
    deleteDialogActions: {
      justifyContent: 'space-evenly',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    cancelButton: {
      minWidth: 120,
    },
    scrollView: {
      flex: 1,
    },
  });

  // Load calorie goal
  useEffect(() => {
    const loadCalorieGoal = async () => {
      try {
        const currentGoal = await goalService.getCurrentGoal();
        if (currentGoal) {
          setCalorieGoal(currentGoal.daily_calorie_target);
        }
      } catch (error) {
        console.error('Error loading calorie goal:', error);
      }
    };
    loadCalorieGoal();
  }, []);

  // Combined fetch function for logs and potentially Garmin data
  const fetchDataForDate = useCallback(async (dateToFetch: string) => {
    setIsLoading(true);
    // Reset states
    setLogs([]);
    setNutritionSummary({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    setDailySummary(null);

    let logsData = [];
    let garminResult = null;
    try {
      // Always fetch logs, even if Garmin fails
      try {
        logsData = await foodLogService.getLogs(dateToFetch);
        setLogs(logsData);
        if (logsData && logsData.length > 0) {
          const summary = logsData.reduce((acc, log) => {
            const calories = log.calories_per_serving || 0;
            const protein = log.protein_grams || 0;
            const carbs = log.carbs_grams || 0;
            const fat = log.fat_grams || 0;
            const servings = log.servings || 1;
            return {
              calories: acc.calories + (calories * servings),
              protein: acc.protein + (protein * servings),
              carbs: acc.carbs + (carbs * servings),
              fat: acc.fat + (fat * servings),
            };
          }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
          setNutritionSummary(summary);
        }
      } catch (err) {
        // Keep error logging for production debugging
        console.error('[LogScreen] Error fetching logs:', err);
      }

      try {
        garminResult = await fitnessService.getRefreshedGarminSummary(dateToFetch);
        setDailySummary(garminResult.summary);
        if (garminResult.error) {
          // Keep error logging for production debugging
          console.warn(`[LogScreen] Error fetching Garmin summary (Source: ${garminResult.source}):`, garminResult.error);
        }
      } catch (err) {
        // Keep error logging for production debugging
        console.warn('[LogScreen] Garmin fetch failed:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchDataForDate(selectedDate);
    }, [selectedDate, fetchDataForDate])
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const formattedDate = formatDate(date);
      setSelectedDate(formattedDate);
    }
  };

  const navigateToAddLog = (mealType: string) => {
    navigation.navigate('SearchFoodForLogScreen', { saveContext: { type: 'log', date: selectedDate, mealType } });
  };

  const navigateToLogDetails = (logId: string) => {
    navigation.navigate('LogDetails', { logId });
  };

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleDeleteLog = (id: number) => {
    setSelectedLogId(id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedLogId) return;

    try {
      setIsDeleting(true);
      await foodLogService.deleteLog(selectedLogId);

      // Refresh logs after deletion
      await fetchDataForDate(selectedDate);
      setShowDeleteDialog(false);
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error deleting log:', error);
      Alert.alert('Error', 'Failed to delete log. Please try again.');
    } finally {
      setIsDeleting(false);
      setSelectedLogId(null);
    }
  };

  const renderMealSection = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const mealLogs = logs.filter(log => log.meal_type === mealType);
    const mealCalories = mealLogs.reduce((sum, log) => sum + ((log.calories_per_serving || 0) * (log.servings || 1)), 0);

    const mealTitles = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
      snack: 'Snacks',
    };

    const mealIcons = {
      breakfast: 'coffee',
      lunch: 'food',
      dinner: 'food-variant',
      snack: 'cookie',
    };

    return (
      <Card style={styles.mealCard}>
        <Card.Title
          title={mealTitles[mealType]}
          subtitle={`${Math.round(mealCalories)} cal`}
          left={(props: { size: number; color?: string }) => (
            <Avatar.Icon
              {...props}
              icon={mealIcons[mealType]}
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
          right={(props: { size: number; color?: string }) => (
            <Button
              icon="plus"
              mode="text"
              onPress={() => navigateToAddLog(mealType)}
            >
              Add
            </Button>
          )}
        />

        <Divider />

        {mealLogs.length > 0 ? (
          <Card.Content>
            {mealLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{log.food_name || 'Unknown Food'}</Text>
                  <Text style={styles.servingInfo}>
                    {log.servings} {log.servings === 1 ? 'serving' : 'servings'}
                  </Text>
                </View>

                <View style={styles.nutritionInfo}>
                  <Text style={styles.calories}>
                    {Math.round((log.calories_per_serving || 0) * (log.servings || 1))} cal
                  </Text>
                  <Text style={styles.macros}>
                    P: {((log.protein_grams || 0) * (log.servings || 1)).toFixed(1)}g •
                    C: {((log.carbs_grams || 0) * (log.servings || 1)).toFixed(1)}g •
                    F: {((log.fat_grams || 0) * (log.servings || 1)).toFixed(1)}g
                  </Text>
                  <Button
                    icon="delete"
                    mode="text"
                    compact
                    loading={isDeleting}
                    onPress={() => log.id && handleDeleteLog(Number(log.id))}
                    style={styles.deleteButton}
                    textColor={theme.colors.error}
                  >
                    Remove
                  </Button>
                </View>
              </View>
            ))}
          </Card.Content>
        ) : (
          <Card.Content style={styles.emptyMeal}>
            <Text style={styles.emptyMealText}>
              No foods logged for {mealTitles[mealType]}
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigateToAddLog(mealType)}
              style={styles.addButton}
            >
              Add Food
            </Button>
          </Card.Content>
        )}
      </Card>
    );
  };

  // Example of how to potentially use the Garmin data (needs UI implementation)
  const calculateBonusCalories = () => {
    if (dailySummary && dailySummary.active_calories) {
      // Placeholder logic: 50% of active calories as bonus
      return Math.round(dailySummary.active_calories * 0.5);
    }
    return 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateSelector}>
        <TouchableOpacity onPress={goToPreviousDay}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} style={styles.calendarIcon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextDay}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Card style={styles.summaryCard}>
        <Card.Content style={styles.summaryContent}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={[
              styles.summaryValue,
              nutritionSummary.calories > calorieGoal && { color: theme.colors.error }
            ]}>
              {Math.round(nutritionSummary.calories)} / {calorieGoal}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Protein</Text>
            <Text style={styles.summaryValue}>{Math.round(nutritionSummary.protein)}g</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Carbs</Text>
            <Text style={styles.summaryValue}>{Math.round(nutritionSummary.carbs)}g</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Fat</Text>
            <Text style={styles.summaryValue}>{Math.round(nutritionSummary.fat)}g</Text>
          </View>
        </Card.Content>
      </Card>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <FlatList
            data={['breakfast', 'lunch', 'dinner', 'snack']}
            renderItem={({ item }) => renderMealSection(item as 'breakfast' | 'lunch' | 'dinner' | 'snack')}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.mealList}
          />
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title style={styles.deleteDialogTitle}>Remove Food Log</Dialog.Title>
          <Dialog.Content>
            <View style={styles.deleteDialogContent}>
              <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.colors.error} style={styles.deleteIcon} />
              <Text style={styles.deleteDialogText}>Are you sure you want to remove this food from your log?</Text>
              <Text style={styles.deleteDialogSubtext}>This action cannot be undone.</Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.deleteDialogActions}>
            <Button
              mode="outlined"
              onPress={() => setShowDeleteDialog(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirmDelete}
              loading={isDeleting}
              buttonColor={theme.colors.error}
              style={styles.deleteButton}
            >
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LoadingOverlay visible={isDeleting} message="Deleting log..." />
    </View>
  );
};

export default LogScreen;