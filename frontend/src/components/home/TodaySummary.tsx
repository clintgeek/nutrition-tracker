import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { goalService, Goal } from '../../services/goalService';
import { summaryService, DailySummary } from '../../services/summaryService';

// Mock data for now - in a real app, this would come from an API
interface NutritionSummary {
  calories: {
    consumed: number;
    goal: number;
  };
  macros: {
    protein: { consumed: number; goal: number; isSet: boolean };
    carbs: { consumed: number; goal: number; isSet: boolean };
    fat: { consumed: number; goal: number; isSet: boolean };
  };
}

const TodaySummary: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [summary, setSummary] = useState<NutritionSummary>({
    calories: {
      consumed: 0,
      goal: 2000,
    },
    macros: {
      protein: { consumed: 0, goal: 0, isSet: false },
      carbs: { consumed: 0, goal: 0, isSet: false },
      fat: { consumed: 0, goal: 0, isSet: false },
    },
  });
  const [hasCalorieGoal, setHasCalorieGoal] = useState<boolean | null>(null);
  const [hasMacroGoal, setHasMacroGoal] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // In a real app, you would fetch the data here
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchTodaySummary(),
          fetchUserGoals()
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchTodaySummary = async () => {
    try {
      // Get today's date
      const today = new Date();

      // Fetch the summary for today
      const dailySummary = await summaryService.getDailySummary(today);

      // Update the summary state with the fetched data
      setSummary(prev => ({
        calories: {
          consumed: dailySummary.total_calories || 0,
          goal: prev.calories.goal,
        },
        macros: {
          protein: {
            consumed: dailySummary.total_protein || 0,
            goal: prev.macros.protein.goal,
            isSet: prev.macros.protein.isSet
          },
          carbs: {
            consumed: dailySummary.total_carbs || 0,
            goal: prev.macros.carbs.goal,
            isSet: prev.macros.carbs.isSet
          },
          fat: {
            consumed: dailySummary.total_fat || 0,
            goal: prev.macros.fat.goal,
            isSet: prev.macros.fat.isSet
          },
        }
      }));
    } catch (error) {
      console.error('Error fetching today\'s summary:', error);
    }
  };

  const fetchUserGoals = async () => {
    try {
      const currentGoal = await goalService.getCurrentGoal();
      console.log('Current goal:', currentGoal);

      if (currentGoal) {
        // Check if user has calorie goal
        const hasCalories = currentGoal.daily_calorie_target > 0;

        // Check if user has macro goals
        const hasProtein = !!currentGoal.protein_target_grams && currentGoal.protein_target_grams > 0;
        const hasCarbs = !!currentGoal.carbs_target_grams && currentGoal.carbs_target_grams > 0;
        const hasFat = !!currentGoal.fat_target_grams && currentGoal.fat_target_grams > 0;

        // Update state
        setHasCalorieGoal(hasCalories);
        setHasMacroGoal(hasProtein || hasCarbs || hasFat);

        // Update summary with actual goals
        setSummary(prev => ({
          calories: {
            consumed: prev.calories.consumed,
            goal: currentGoal.daily_calorie_target || 2000,
          },
          macros: {
            protein: {
              consumed: prev.macros.protein.consumed,
              goal: currentGoal.protein_target_grams || 0,
              isSet: hasProtein
            },
            carbs: {
              consumed: prev.macros.carbs.consumed,
              goal: currentGoal.carbs_target_grams || 0,
              isSet: hasCarbs
            },
            fat: {
              consumed: prev.macros.fat.consumed,
              goal: currentGoal.fat_target_grams || 0,
              isSet: hasFat
            },
          }
        }));
      } else {
        console.log('No current goal found');
        setHasCalorieGoal(false);
        setHasMacroGoal(false);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      // If there's an error, we'll just show both sections
      setHasCalorieGoal(true);
      setHasMacroGoal(true);
    }
  };

  const calculatePercentage = (consumed: number, goal: number) => {
    if (!goal) return 0;
    return Math.min(consumed / goal, 1);
  };

  const navigateToGoals = () => {
    navigation.navigate('GoalsStack');
  };

  if (isLoading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Today's Summary</Title>
          <Text>Loading...</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Today's Summary</Title>

        {hasCalorieGoal && (
          <View style={styles.calorieSection}>
            <View style={styles.calorieHeader}>
              <Text style={styles.calorieLabel}>Calories</Text>
              <Text style={styles.calorieValue}>
                {summary.calories.consumed} / {summary.calories.goal}
              </Text>
            </View>
            <ProgressBar
              progress={calculatePercentage(summary.calories.consumed, summary.calories.goal)}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
          </View>
        )}

        {hasMacroGoal && (
          <View style={styles.macrosSection}>
            <Text style={styles.macrosTitle}>Macronutrients</Text>

            {summary.macros.protein.isSet && (
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>
                    {summary.macros.protein.consumed}g / {summary.macros.protein.goal}g
                  </Text>
                </View>
                <ProgressBar
                  progress={calculatePercentage(summary.macros.protein.consumed, summary.macros.protein.goal)}
                  color="#4CAF50"
                  style={styles.progressBar}
                />
              </View>
            )}

            {summary.macros.carbs.isSet && (
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={styles.macroValue}>
                    {summary.macros.carbs.consumed}g / {summary.macros.carbs.goal}g
                  </Text>
                </View>
                <ProgressBar
                  progress={calculatePercentage(summary.macros.carbs.consumed, summary.macros.carbs.goal)}
                  color="#FF9800"
                  style={styles.progressBar}
                />
              </View>
            )}

            {summary.macros.fat.isSet && (
              <View style={styles.macroItem}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={styles.macroValue}>
                    {summary.macros.fat.consumed}g / {summary.macros.fat.goal}g
                  </Text>
                </View>
                <ProgressBar
                  progress={calculatePercentage(summary.macros.fat.consumed, summary.macros.fat.goal)}
                  color="#E91E63"
                  style={styles.progressBar}
                />
              </View>
            )}
          </View>
        )}

        {hasCalorieGoal === false && hasMacroGoal === false && (
          <View style={styles.noGoalsMessage}>
            <Text style={styles.noGoalsText}>No nutrition goals have been set yet. Set your daily targets to track your progress!</Text>
            <Button
              mode="contained"
              onPress={navigateToGoals}
              style={styles.goalsButton}
            >
              Set Goals
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    marginBottom: 16,
  },
  calorieSection: {
    marginBottom: 24,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calorieLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calorieValue: {
    fontSize: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  macrosSection: {
    marginTop: 8,
  },
  macrosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  macroItem: {
    marginBottom: 16,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroLabel: {
    fontSize: 14,
  },
  macroValue: {
    fontSize: 14,
  },
  noGoalsMessage: {
    padding: 16,
    alignItems: 'center',
  },
  noGoalsText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  goalsButton: {
    marginTop: 8,
  },
});

export default TodaySummary;