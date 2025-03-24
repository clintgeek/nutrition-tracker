import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Card, Title, Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../../types/navigation';
import { mealPlanService, MealPlan } from '../../services/mealPlanService';
import { format, addDays, startOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { SkeletonLoader } from '../common';

const DAY_CARD_WIDTH = 160;
const DAY_CARD_MARGIN = 8;
const MOBILE_BREAKPOINT = 768;

const MealPlanCard: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [mealPlans, setMealPlans] = useState<{ [date: string]: MealPlan[] }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [allDates, setAllDates] = useState<string[]>([]);

  const isMobile = SCREEN_WIDTH < MOBILE_BREAKPOINT;
  const DAYS_PER_ROW = isMobile ? 1 : Math.floor((SCREEN_WIDTH - 32) / (DAY_CARD_WIDTH + DAY_CARD_MARGIN * 2));

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setIsLoading(true);
      const today = startOfDay(new Date());
      const endDate = addDays(today, 6);

      // Generate all dates in the range
      const dates = eachDayOfInterval({ start: today, end: endDate });
      const dateStrings = dates.map(date => format(date, 'yyyy-MM-dd'));
      setAllDates(dateStrings);

      const plans = await mealPlanService.getMealPlansByDateRange(
        format(today, 'yyyy-MM-dd'),
        format(endDate, 'yyyy-MM-dd')
      );

      // Group meals by date
      const groupedPlans = plans.reduce((acc, plan) => {
        const date = plan.date.split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(plan);
        return acc;
      }, {} as { [date: string]: MealPlan[] });

      setMealPlans(groupedPlans);
    } catch (error) {
      console.error('Error loading meal plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'food-croissant';
      case 'lunch':
        return 'food-variant';
      case 'dinner':
        return 'food-steak';
      case 'snack':
        return 'food-apple';
      default:
        return 'food';
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return theme.colors.primary;
      case 'lunch':
        return theme.colors.secondary;
      case 'dinner':
        return theme.colors.error;
      case 'snack':
        return theme.colors.tertiary;
      default:
        return theme.colors.primary;
    }
  };

  const renderDayCard = (date: string) => {
    const plans = mealPlans[date] || [];
    const formattedDate = format(new Date(date), 'EEE, MMM d');
    const isToday = date === format(new Date(), 'yyyy-MM-dd');

    return (
      <View key={date} style={[
        styles.dayCard,
        !isMobile && { width: DAY_CARD_WIDTH }
      ]}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dateText, isToday && styles.todayText]}>
            {formattedDate}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </View>
        <View style={styles.mealsContainer}>
          {plans.length > 0 ? (
            plans.map((plan) => (
              <View key={plan.id} style={styles.mealItem}>
                <MaterialCommunityIcons
                  name={getMealTypeIcon(plan.meal_type)}
                  size={16}
                  color={getMealTypeColor(plan.meal_type)}
                  style={styles.mealIcon}
                />
                <Text style={styles.mealText} numberOfLines={1}>
                  {plan.name}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="plus-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.emptyText}>Add meals</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRow = (dates: string[], index: number) => (
    <ScrollView
      key={index}
      horizontal={!isMobile}
      showsHorizontalScrollIndicator={false}
      style={styles.row}
    >
      {dates.map((date) => renderDayCard(date))}
    </ScrollView>
  );

  if (isLoading) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Title style={styles.title}>Upcoming Meals</Title>
          <View style={styles.skeletonContainer}>
            <SkeletonLoader width={isMobile ? '100%' : DAY_CARD_WIDTH} height={120} style={styles.skeletonCard} />
            <SkeletonLoader width={isMobile ? '100%' : DAY_CARD_WIDTH} height={120} style={styles.skeletonCard} />
            <SkeletonLoader width={isMobile ? '100%' : DAY_CARD_WIDTH} height={120} style={styles.skeletonCard} />
          </View>
        </Card.Content>
      </Card>
    );
  }

  const rows = [];
  for (let i = 0; i < allDates.length; i += DAYS_PER_ROW) {
    rows.push(allDates.slice(i, i + DAYS_PER_ROW));
  }

  return (
    <TouchableOpacity onPress={() => navigation.navigate('MealPlanner')}>
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.header}>
            <Title style={styles.title}>Upcoming Meals</Title>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.primary}
            />
          </View>
          <Divider style={styles.divider} />
          {rows.map((row, index) => renderRow(row, index))}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginBottom: 12,
  },
  seeAllLink: {
    color: '#2196F3',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -8,
  },
  dayCard: {
    marginHorizontal: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  addButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#e9ecef',
  },
  addIcon: {
    color: '#6c757d',
  },
  mealsContainer: {
    marginTop: 8,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealIcon: {
    marginRight: 8,
  },
  mealText: {
    flex: 1,
    fontSize: 13,
    color: '#495057',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    marginTop: 8,
    color: '#6c757d',
    fontSize: 13,
  },
  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -8,
  },
  loadingCard: {
    width: '100%',
    marginHorizontal: 8,
    marginBottom: 16,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  skeletonContainer: {
    flexDirection: 'row',
    marginRight: 16,
  },
  skeletonCard: {
    borderRadius: 8,
  },
  todayText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  todayBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 12,
    marginLeft: 6,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyMealsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  noMealsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  row: {
    marginBottom: 12,
  },
});

export default MealPlanCard;