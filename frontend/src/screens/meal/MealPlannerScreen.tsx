import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput, Dimensions, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Portal, Dialog, Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config';
import * as Clipboard from 'expo-clipboard';

interface Meal {
  id: string;
  name: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface DayMeals {
  [date: string]: Meal[];
}

export const MealPlannerScreen: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [meals, setMeals] = useState<DayMeals>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddMealVisible, setIsAddMealVisible] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().split('T')[0]);

  const saveMeals = async (updatedMeals: DayMeals) => {
    await AsyncStorage.setItem('meals', JSON.stringify(updatedMeals));
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
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.monthSection}>
            <TouchableOpacity onPress={() => subtractMonth?.()} style={styles.iconButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {`${currentDate.toLocaleString('default', { month: 'long' })}`}
            </Text>
            <TouchableOpacity onPress={() => addMonth?.()} style={styles.iconButton}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.yearSection}>
            <TouchableOpacity onPress={subtractYear} style={styles.iconButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.yearText}>{`${currentDate.getFullYear()}`}</Text>
            <TouchableOpacity onPress={addYear} style={styles.iconButton}>
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

    const handleDeleteMeal = (meal: Meal) => {
      const updatedMeals = { ...meals };
      const dateMeals = [...(updatedMeals[date.dateString] || [])];
      updatedMeals[date.dateString] = dateMeals.filter(m => m.id !== meal.id);
      setMeals(updatedMeals);
      saveMeals(updatedMeals);
    };

    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedDate(date.dateString);
          setIsAddMealVisible(true);
        }}
        style={[
          styles.dayContainer,
          state === 'disabled' ? styles.disabledDay : null,
          isSelected ? { backgroundColor: theme.colors.primaryContainer } : null,
        ]}
      >
        <Text style={[
          styles.dayText,
          state === 'disabled' ? styles.disabledText : null,
          date.day === new Date().getDate() &&
          date.month === new Date().getMonth() + 1 &&
          date.year === new Date().getFullYear() ? styles.todayText : null
        ]}>
          {date.day}
        </Text>
        <ScrollView style={styles.mealsContainer}>
          {dayMeals.map((meal) => (
            <View key={meal.id} style={styles.mealContainer}>
              <View style={[
                styles.mealPill,
                { backgroundColor: getMealTypeColor(meal.type, theme) }
              ]}>
                <Text numberOfLines={1} style={styles.mealText}>
                  {meal.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
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

  const getMealTypeColor = (type: string, theme: any) => {
    switch (type) {
      case 'breakfast':
        return theme.colors.tertiaryContainer;
      case 'lunch':
        return theme.colors.secondaryContainer;
      case 'dinner':
        return theme.colors.primaryContainer;
      case 'snack':
        return theme.colors.surfaceVariant;
      default:
        return theme.colors.surface;
    }
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;

    const newMeal: Meal = {
      id: Date.now().toString(),
      name: newMealName.trim(),
      date: selectedDate,
      type: 'dinner',
    };

    const updatedMeals = {
      ...meals,
      [selectedDate]: [...(meals[selectedDate] || []), newMeal],
    };

    setMeals(updatedMeals);
    await AsyncStorage.setItem('meals', JSON.stringify(updatedMeals));
    setNewMealName('');
    setIsAddMealVisible(false);
  };

  const handleGetCalendarURL = async () => {
    const calendarUrl = `${API_URL}/meals/ical`;
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

  React.useEffect(() => {
    const loadMeals = async () => {
      const storedMeals = await AsyncStorage.getItem('meals');
      if (storedMeals) {
        setMeals(JSON.parse(storedMeals));
      }
    };
    loadMeals();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="contained"
          onPress={handleGetCalendarURL}
          style={styles.calendarButton}
        >
          Get Calendar Subscription URL
        </Button>
      </View>
      <Calendar
        current={currentMonth}
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setIsAddMealVisible(true);
        }}
        dayComponent={DayComponent}
        customHeader={CustomHeader}
        hideExtraDays={false}
        theme={{
          backgroundColor: theme.colors.background,
          calendarBackground: theme.colors.background,
          textSectionTitleColor: theme.colors.onBackground,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: theme.colors.onPrimary,
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          textDayHeaderFontSize: 14,
          textDayHeaderFontWeight: '600',
        }}
        style={styles.calendar}
      />

      <Portal>
        <Dialog visible={isAddMealVisible} onDismiss={() => setIsAddMealVisible(false)}>
          <Dialog.Title>Add Meal for {selectedDate}</Dialog.Title>
          <Dialog.Content>
            <RNTextInput
              placeholder="Meal Name"
              value={newMealName}
              onChangeText={setNewMealName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsAddMealVisible(false)}>Cancel</Button>
            <Button onPress={handleAddMeal}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const HEADER_HEIGHT = 60;
const DAY_HEADER_HEIGHT = 30;
const windowHeight = Dimensions.get('window').height;
const windowWidth = Dimensions.get('window').width;
const CALENDAR_HEIGHT = windowHeight - HEADER_HEIGHT - DAY_HEADER_HEIGHT - 40;
const DAY_HEIGHT = Math.floor((CALENDAR_HEIGHT / 6) * 0.75);
const DAY_WIDTH = Math.floor(windowWidth / 7);

const styles = StyleSheet.create({
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
});

export default MealPlannerScreen;