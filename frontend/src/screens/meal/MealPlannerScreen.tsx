import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput, Dimensions, ScrollView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Portal, Dialog, Button, Text, useTheme, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import * as Clipboard from 'expo-clipboard';
import { DatePickerModal } from 'react-native-paper-dates';
import { mealPlanService, MealPlan } from '../../services/mealPlanService';
import { format } from 'date-fns';

interface Meal {
  id: string;
  name: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayMeals {
  [date: string]: MealPlan[];
}

export const MealPlannerScreen: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAddMealVisible, setIsAddMealVisible] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [meals, setMeals] = useState<DayMeals>({});
  const [isLoading, setIsLoading] = useState(false);

  // Add function to sort and group meals by date
  const sortedMealDates = useMemo(() => {
    return Object.keys(meals)
      .filter(date => meals[date].length > 0) // Only include dates that have meals
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [meals]);

  // Add function to get day name
  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Add function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateLong = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Custom header for the calendar
  const CustomHeader = ({ date, addMonth, subtractMonth }: { date: any; addMonth?: () => void; subtractMonth?: () => void }) => {
    // Ensure we have a valid date object
    const currentDate = date ? new Date(date.timestamp || date) : new Date();

    const addYear = () => {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + 1);
      setCurrentMonth(newDate.toISOString().split('T')[0]);
    };

    const subtractYear = () => {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() - 1);
      setCurrentMonth(newDate.toISOString().split('T')[0]);
    };

    return (
      <View style={styles(theme).headerContainer}>
        <View style={styles(theme).headerRow}>
          <View style={styles(theme).monthSection}>
            <TouchableOpacity onPress={() => subtractMonth?.()} style={styles(theme).iconButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles(theme).monthText}>
              {`${currentDate.toLocaleString('default', { month: 'long' })}`}
            </Text>
            <TouchableOpacity onPress={() => addMonth?.()} style={styles(theme).iconButton}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles(theme).yearSection}>
            <TouchableOpacity onPress={subtractYear} style={styles(theme).iconButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles(theme).yearText}>{`${currentDate.getFullYear()}`}</Text>
            <TouchableOpacity onPress={addYear} style={styles(theme).iconButton}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Custom day component
  const DayComponent = useCallback(({ date, state }) => {
    const dayMeals = meals[date.dateString] || [];
    const isSelected = date.dateString === selectedDate;

    const handleDeleteMeal = async (meal: MealPlan) => {
      try {
        await mealPlanService.deleteMealPlan(meal.id);
        const updatedMeals = { ...meals };
        const dateMeals = [...(updatedMeals[date.dateString] || [])];
        updatedMeals[date.dateString] = dateMeals.filter(m => m.id !== meal.id);
        setMeals(updatedMeals);
      } catch (error) {
        console.error('Error deleting meal:', error);
      }
    };

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedDate(date.dateString);
          setIsAddMealVisible(true);
        }}
        style={[
          styles(theme).dayContainer,
          state === 'disabled' ? styles(theme).disabledDay : null,
          isSelected ? { backgroundColor: `${theme.colors.primary}20` } : null,
        ]}
      >
        <Text style={[
          styles(theme).dayText,
          state === 'disabled' ? styles(theme).disabledText : null,
          date.day === new Date().getDate() &&
          date.month === new Date().getMonth() + 1 &&
          date.year === new Date().getFullYear() ? styles(theme).todayText : null,
          isSelected ? { color: theme.colors.primary } : null
        ]}>
          {date.day}
        </Text>
        <ScrollView style={styles(theme).mealsContainer}>
          {dayMeals.map((meal) => (
            <View key={meal.id} style={styles(theme).mealContainer}>
              <View style={[
                styles(theme).mealPill,
                { backgroundColor: getMealTypeColor(meal.meal_type, theme) }
              ]}>
                <Text numberOfLines={1} style={styles(theme).mealText}>
                  {meal.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles(theme).deleteButton}
                onPress={() => handleDeleteMeal(meal)}
              >
                <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </TouchableOpacity>
    );
  }, [meals, selectedDate, theme]);

  const getMealTypeColor = (meal_type: string, theme: any) => {
    switch (meal_type) {
      case 'breakfast':
        return `${theme.colors.primary}15`;
      case 'lunch':
        return `${theme.colors.primary}20`;
      case 'dinner':
        return `${theme.colors.primary}25`;
      case 'snack':
        return `${theme.colors.primary}10`;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  const addMealToDatabase = async (mealData: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_id' | 'is_deleted'>) => {
    try {
      const newMeal = await mealPlanService.createMealPlan(mealData);
      setMeals(prevMeals => ({
        ...prevMeals,
        [selectedDate]: [...(prevMeals[selectedDate] || []), newMeal]
      }));
      return newMeal;
    } catch (error) {
      console.error('Error adding meal:', error);
      throw error;
    }
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;

    try {
      await addMealToDatabase({
        name: newMealName.trim(),
        date: selectedDate,
        meal_type: 'dinner'
      });
      setNewMealName('');
      setIsAddMealVisible(false);
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleGetCalendarURL = async () => {
    const calendarUrl = `${API_URL}/meal-plans/ical`;
    await Clipboard.setStringAsync(calendarUrl);

    alert(
      'Calendar subscription URL copied to clipboard!\n\n' +
      'To subscribe to the shared meal calendar:\n\n' +
      '1. Google Calendar:\n' +
      '   • Open Settings > Add Calendar > From URL\n' +
      '   • Paste the URL and click "Add Calendar"\n\n' +
      '2. Apple Calendar:\n' +
      '   • File > New Calendar Subscription\n' +
      '   • Paste the URL and click "Subscribe"\n\n' +
      '3. Outlook:\n' +
      '   • Add Calendar > From Internet\n' +
      '   • Paste the URL and click "OK"\n\n' +
      'The calendar will automatically sync whenever meals are added, edited, or removed.'
    );
  };

  // Update handleDateChange to use the DatePickerModal
  const handleDateChange = useCallback(({ date }: { date: Date }) => {
    setDatePickerVisible(false);
    if (date) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  }, []);

  // Add function to open add meal dialog
  const handleAddMealPress = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setIsAddMealVisible(true);
  };

  useEffect(() => {
    loadMeals();
  }, [selectedDate, currentMonth]);

  const loadMeals = async () => {
    try {
      setIsLoading(true);
      // Get the first and last day of the current month
      const currentDate = new Date(currentMonth);
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Format dates for the API
      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];

      // Load meals for the entire month
      const mealPlans = await mealPlanService.getMealPlansByDateRange(startDate, endDate);

      // Group meals by date and ensure dates are in YYYY-MM-DD format
      const groupedMeals = mealPlans.reduce((acc, meal) => {
        // Ensure the date is in YYYY-MM-DD format
        const date = meal.date.split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(meal);
        return acc;
      }, {} as DayMeals);

      // Initialize empty arrays for all days in the month
      const allDaysInMonth: DayMeals = {};
      let currentDay = new Date(firstDayOfMonth);
      while (currentDay <= lastDayOfMonth) {
        const dateString = currentDay.toISOString().split('T')[0];
        allDaysInMonth[dateString] = groupedMeals[dateString] || [];
        currentDay.setDate(currentDay.getDate() + 1);
      }

      setMeals(allDaysInMonth);
    } catch (error) {
      console.error('Error loading meals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to handle calendar month change
  const handleMonthChange = (month: { dateString: string }) => {
    setCurrentMonth(month.dateString);
  };

  const handleUpdateMeal = async (id: number, mealData: Partial<MealPlan>) => {
    try {
      const updatedMeal = await mealPlanService.updateMealPlan(id, mealData);
      setMeals(prevMeals => ({
        ...prevMeals,
        [selectedDate]: prevMeals[selectedDate].map(meal =>
          meal.id === id ? updatedMeal : meal
        )
      }));
    } catch (error) {
      console.error('Error updating meal:', error);
    }
  };

  const handleDeleteMeal = async (id: number) => {
    try {
      await mealPlanService.deleteMealPlan(id);
      setMeals(prevMeals => ({
        ...prevMeals,
        [selectedDate]: prevMeals[selectedDate].filter(meal => meal.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  const styles = (theme: any) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    calendar: {
      height: CALENDAR_HEIGHT,
      marginTop: 0,
    },
    headerContainer: {
      height: HEADER_HEIGHT,
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    monthSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-start',
    },
    yearSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'flex-end',
    },
    yearText: {
      fontSize: 16,
      fontWeight: '600',
      marginHorizontal: 8,
    },
    monthText: {
      fontSize: 18,
      fontWeight: '600',
      marginHorizontal: 8,
    },
    dayContainer: {
      width: DAY_WIDTH,
      height: DAY_HEIGHT,
      padding: 4,
      borderWidth: 0.5,
      borderColor: '#e0e0e0',
      backgroundColor: '#fff',
    },
    dayText: {
      textAlign: 'right',
      marginBottom: 4,
      fontSize: 14,
      fontWeight: '500',
    },
    todayText: {
      color: '#1a73e8',
      fontWeight: '700',
    },
    disabledDay: {
      backgroundColor: '#f5f5f5',
    },
    disabledText: {
      color: '#bdbdbd',
    },
    mealsContainer: {
      flex: 1,
    },
    mealContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    mealPill: {
      flex: 1,
      borderRadius: 4,
      padding: 4,
    },
    mealText: {
      fontSize: 12,
      textAlign: 'left',
      paddingHorizontal: 4,
    },
    input: {
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 4,
      padding: 8,
    },
    mealTypeButton: {
      marginTop: 8,
    },
    iconButton: {
      padding: 4,
    },
    radioButtonRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 8,
    },
    radioButtonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    radioCircle: {
      height: 20,
      width: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#000',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    selectedRadioCircle: {
      backgroundColor: '#000',
    },
    radioLabel: {
      fontSize: 14,
    },
    header: {
      padding: 8,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 0,
    },
    calendarButton: {
      marginBottom: 0,
    },
    deleteButton: {
      padding: 2,
      marginLeft: 4,
    },
    mealListContainer: {
      padding: 16,
      backgroundColor: '#fff',
    },
    mealListTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 16,
      color: '#000',
    },
    dateSection: {
      marginBottom: 16,
    },
    dateTitleContainer: {
      marginBottom: 8,
    },
    dateTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: '#666',
    },
    mealListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    mealTypeIndicator: {
      width: 4,
      height: 24,
      borderRadius: 2,
      marginRight: 12,
    },
    mealListName: {
      flex: 1,
      fontSize: 16,
      color: '#000',
    },
    mealListDeleteButton: {
      padding: 8,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    emptyStateText: {
      marginTop: 8,
      fontSize: 16,
      color: '#666',
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
    datePickerButton: {
      marginBottom: 16,
    },
    inputWrapper: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
      marginLeft: 4,
    },
    inputContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 4,
      padding: 16,
      height: 52,
      justifyContent: 'center',
    },
    inputText: {
      fontSize: 16,
      color: theme.colors.onBackground,
    },
    inputGroup: {
      marginBottom: 16,
    },
    dateInput: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
      minHeight: 56,
    },
    textInput: {
      padding: 16,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 4,
      minHeight: 56,
      fontSize: 16,
    },
  });

  const renderMealItem = (meal: MealPlan) => (
    <TouchableOpacity
      key={meal.id}
      style={[
        styles(theme).mealListItem,
        { backgroundColor: theme.colors.surface }
      ]}
      onPress={() => handleUpdateMeal(meal.id, { name: newMealName })}
    >
      <View style={[
        styles(theme).mealTypeIndicator,
        { backgroundColor: getMealTypeColor(meal.meal_type, theme) }
      ]} />
      <Text style={styles(theme).mealListName}>{meal.name}</Text>
      <TouchableOpacity
        onPress={() => handleDeleteMeal(meal.id)}
        style={styles(theme).mealListDeleteButton}
      >
        <MaterialCommunityIcons
          name="delete-outline"
          size={20}
          color={theme.colors.error}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const CALENDAR_HEIGHT = windowHeight - HEADER_HEIGHT - DAY_HEADER_HEIGHT - 40;
  const DAY_HEIGHT = Math.floor((CALENDAR_HEIGHT / 6) * 0.75);
  const DAY_WIDTH = Math.floor(windowWidth / 7);
  const isMobile = windowWidth < 768;

  return (
    <View style={styles(theme).container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={styles(theme).header}>
          <Button
            mode="contained"
            onPress={handleGetCalendarURL}
            style={styles(theme).calendarButton}
          >
            Get Calendar Subscription URL
          </Button>
        </View>
        {!isMobile && (
          <Calendar
            current={currentMonth}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setIsAddMealVisible(true);
            }}
            onMonthChange={handleMonthChange}
            dayComponent={DayComponent}
            customHeader={CustomHeader}
            hideExtraDays={false}
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.onBackground,
              selectedDayBackgroundColor: theme.colors.primaryContainer,
              selectedDayTextColor: theme.colors.onPrimaryContainer,
              todayTextColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
              textDayHeaderFontSize: 14,
              textDayHeaderFontWeight: '600',
            }}
            style={styles(theme).calendar}
          />
        )}

        {/* Meal List Section */}
        <View style={styles(theme).mealListContainer}>
          <Text style={styles(theme).mealListTitle}>Upcoming Meals</Text>
          {sortedMealDates.map((date) => (
            <View key={date} style={styles(theme).dateSection}>
              <View style={styles(theme).dateTitleContainer}>
                <Text style={styles(theme).dateTitle}>
                  {formatDate(date)} • {getDayName(date)}
                </Text>
              </View>
              {meals[date].map(renderMealItem)}
            </View>
          ))}
          {sortedMealDates.length === 0 && (
            <View style={styles(theme).emptyState}>
              <MaterialCommunityIcons
                name="food-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={styles(theme).emptyStateText}>No meals planned yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add FAB */}
      <FAB
        icon="plus"
        style={styles(theme).fab}
        onPress={handleAddMealPress}
        label="Add Meal"
        labelTextColor="white"
        theme={{ colors: { onSecondaryContainer: 'white' }}}
      />

      <Portal>
        <Dialog
          visible={isAddMealVisible}
          onDismiss={() => setIsAddMealVisible(false)}
          style={{ backgroundColor: theme.colors.surface, borderRadius: 28, overflow: 'hidden' }}
        >
          <Dialog.Title>Add Meal</Dialog.Title>
          <Dialog.Content style={{ backgroundColor: theme.colors.surface }}>
            <View style={[styles(theme).inputGroup, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles(theme).inputLabel}>Date</Text>
              {Platform.OS === 'web' ? (
                <View style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: 4,
                  height: 48,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: theme.colors.outline
                }}>
                  <TouchableOpacity
                    onPress={() => setDatePickerVisible(true)}
                    style={{
                      width: '100%',
                      height: '100%',
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: theme.colors.background,
                    }}
                  >
                    <Text>{selectedDate}</Text>
                    <MaterialCommunityIcons
                      name="calendar"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setDatePickerVisible(true)}
                  style={{
                    backgroundColor: theme.colors.background,
                    borderRadius: 4,
                    height: 48,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: theme.colors.outline
                  }}
                >
                  <Text>{selectedDate}</Text>
                  <MaterialCommunityIcons
                    name="calendar"
                    size={20}
                    color={theme.colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles(theme).inputGroup, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles(theme).inputLabel}>Meal Name</Text>
              <RNTextInput
                placeholder="Enter meal name"
                value={newMealName}
                onChangeText={setNewMealName}
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: 4,
                  height: 48,
                  paddingHorizontal: 12,
                  fontSize: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.outline
                }}
              />
            </View>

            <DatePickerModal
              locale="en"
              mode="single"
              visible={datePickerVisible}
              onDismiss={() => setDatePickerVisible(false)}
              date={new Date(selectedDate)}
              onConfirm={handleDateChange}
              presentationStyle="pageSheet"
              startYear={new Date().getFullYear() - 5}
              endYear={new Date().getFullYear()}
              saveLabel="Save"
              animationType="slide"
              closeIcon="close"
            />
          </Dialog.Content>
          <Dialog.Actions style={{ backgroundColor: theme.colors.surface }}>
            <Button onPress={() => setIsAddMealVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleAddMeal}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const HEADER_HEIGHT = 60;
const DAY_HEADER_HEIGHT = 30;

export default MealPlannerScreen;