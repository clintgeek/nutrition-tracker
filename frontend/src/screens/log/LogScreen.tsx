import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Title,
  Divider,
  FAB,
  Chip,
  ActivityIndicator,
  Avatar,
  useTheme,
  Button
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { foodLogService } from '../../services/foodLogService';
import { FoodLog } from '../../types/FoodLog';
import { formatDate, getTodayDate } from '../../utils/dateUtils';
import EmptyState from '../../components/common/EmptyState';

const LogScreen: React.FC = () => {
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

  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      // Use type assertion to bypass type checking
      const logsData = await foodLogService.getLogs(selectedDate) as any[];
      setLogs(logsData as any);

      // Calculate nutrition summary
      const summary = logsData.reduce((acc, log: any) => {
        // Handle potential property name differences
        const calories = log.food?.calories || log.calories_per_serving || 0;
        const protein = log.food?.protein || log.protein_grams || 0;
        const carbs = log.food?.carbs || log.carbs_grams || 0;
        const fat = log.food?.fat || log.fat_grams || 0;
        const servingSize = log.servingSize || log.servings || 1;

        return {
          calories: acc.calories + (calories * servingSize),
          protein: acc.protein + (protein * servingSize),
          carbs: acc.carbs + (carbs * servingSize),
          fat: acc.fat + (fat * servingSize),
        };
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setNutritionSummary(summary);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [selectedDate])
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const formattedDate = date.toISOString().split('T')[0];
      setSelectedDate(formattedDate);
    }
  };

  const navigateToAddLog = () => {
    navigation.navigate('AddLog', { date: selectedDate });
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

  const renderMealSection = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const mealLogs = logs.filter(log => log.mealType === mealType);
    const mealCalories = mealLogs.reduce((sum, log) => sum + (log.food.calories * log.servingSize), 0);

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
          subtitle={`${Math.round(mealCalories)} kcal`}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon={mealIcons[mealType]}
              style={{ backgroundColor: theme.colors.primary }}
            />
          )}
          right={(props) => (
            <Button
              icon="plus"
              mode="text"
              onPress={() => navigation.navigate('AddLog', { date: selectedDate, mealType })}
            >
              Add
            </Button>
          )}
        />

        <Divider />

        {mealLogs.length > 0 ? (
          <Card.Content>
            {mealLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                onPress={() => navigateToLogDetails(log.id)}
                style={styles.logItem}
              >
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{log.food.name}</Text>
                  <Text style={styles.servingInfo}>
                    {log.servingSize} {log.servingUnit}
                  </Text>
                </View>

                <View style={styles.nutritionInfo}>
                  <Text style={styles.calories}>
                    {Math.round(log.food.calories * log.servingSize)} kcal
                  </Text>
                  <Text style={styles.macros}>
                    P: {Math.round(log.food.protein * log.servingSize)}g •
                    C: {Math.round(log.food.carbs * log.servingSize)}g •
                    F: {Math.round(log.food.fat * log.servingSize)}g
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card.Content>
        ) : (
          <Card.Content style={styles.emptyMeal}>
            <Text style={styles.emptyMealText}>
              No foods logged for {mealTitles[mealType].toLowerCase()}
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('AddLog', { date: selectedDate, mealType })}
              style={styles.addButton}
            >
              Add Food
            </Button>
          </Card.Content>
        )}
      </Card>
    );
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
            <Text style={styles.summaryValue}>{Math.round(nutritionSummary.calories)}</Text>
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading food logs...</Text>
        </View>
      ) : logs.length === 0 ? (
        <EmptyState
          icon="food-off"
          title="No Food Logged"
          message={`You haven't logged any food for ${formatDate(selectedDate)}`}
          actionLabel="Add Food"
          onAction={navigateToAddLog}
        />
      ) : (
        <FlatList
          data={['breakfast', 'lunch', 'dinner', 'snack']}
          renderItem={({ item }) => renderMealSection(item as 'breakfast' | 'lunch' | 'dinner' | 'snack')}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.mealList}
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={navigateToAddLog}
        color="white"
      />
    </View>
  );
};

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
    backgroundColor: 'white',
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
    paddingBottom: 80,
  },
  mealCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default LogScreen;