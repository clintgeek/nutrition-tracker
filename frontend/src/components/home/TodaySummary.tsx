import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme } from 'react-native-paper';
import { goalService, Goal } from '../../services/goalService';

// Mock data for now - in a real app, this would come from an API
interface NutritionSummary {
  calories: {
    consumed: number;
    goal: number;
  };
  macros: {
    protein: { consumed: number; goal: number };
    carbs: { consumed: number; goal: number };
    fat: { consumed: number; goal: number };
  };
}

const TodaySummary: React.FC = () => {
  const theme = useTheme();
  const [summary, setSummary] = useState<NutritionSummary>({
    calories: {
      consumed: 1250,
      goal: 2000,
    },
    macros: {
      protein: { consumed: 75, goal: 120 },
      carbs: { consumed: 120, goal: 200 },
      fat: { consumed: 45, goal: 65 },
    },
  });
  const [hasCalorieGoal, setHasCalorieGoal] = useState(true);
  const [hasMacroGoal, setHasMacroGoal] = useState(true);

  // In a real app, you would fetch the data here
  useEffect(() => {
    // fetchTodaySummary();
    fetchUserGoals();
  }, []);

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
              goal: currentGoal.protein_target_grams || 120
            },
            carbs: {
              consumed: prev.macros.carbs.consumed,
              goal: currentGoal.carbs_target_grams || 200
            },
            fat: {
              consumed: prev.macros.fat.consumed,
              goal: currentGoal.fat_target_grams || 65
            },
          }
        }));
      } else {
        console.log('No current goal found');
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
      // If there's an error, we'll just show both sections
      setHasCalorieGoal(true);
      setHasMacroGoal(true);
    }
  };

  const calculatePercentage = (consumed: number, goal: number) => {
    return Math.min(consumed / goal, 1);
  };

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
          </View>
        )}

        {!hasCalorieGoal && !hasMacroGoal && (
          <View style={styles.noGoalsMessage}>
            <Text>No nutrition goals set. Visit the Goals section to set your targets.</Text>
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
});

export default TodaySummary;