import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { goalService, Goal } from '../../services/goalService';
import { summaryService, DailySummary } from '../../services/summaryService';
import { useAuth } from '../../contexts/AuthContext';
import { setAuthToken } from '../../services/apiService';

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
  const { token } = useAuth();
  const [summary, setSummary] = useState<NutritionSummary>({
    calories: {
      consumed: 0,
      goal: 0,
    },
    macros: {
      protein: { consumed: 0, goal: 0, isSet: false },
      carbs: { consumed: 0, goal: 0, isSet: false },
      fat: { consumed: 0, goal: 0, isSet: false },
    },
  });
  const [hasGoals, setHasGoals] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set token in apiService when it changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Ensure we have a token
        if (!token) {
          setError('Please log in to view your summary');
          setIsLoading(false);
          return;
        }

        // First fetch goals to establish baseline
        const currentGoal = await goalService.getCurrentGoal();

        if (!mounted) return;

        // If no goal exists, that's a valid state, not an error
        if (!currentGoal) {
          setHasGoals(false);
          setIsLoading(false);
          return;
        }

        const hasValidGoals = !!(currentGoal?.daily_calorie_target && currentGoal.daily_calorie_target > 0);
        setHasGoals(hasValidGoals);

        if (hasValidGoals) {
          // Update summary with goals
          setSummary(prev => ({
            ...prev,
            calories: {
              consumed: prev.calories.consumed,
              goal: currentGoal.daily_calorie_target,
            },
            macros: {
              protein: {
                ...prev.macros.protein,
                goal: currentGoal.protein_target_grams || 0,
                isSet: !!(currentGoal.protein_target_grams && currentGoal.protein_target_grams > 0)
              },
              carbs: {
                ...prev.macros.carbs,
                goal: currentGoal.carbs_target_grams || 0,
                isSet: !!(currentGoal.carbs_target_grams && currentGoal.carbs_target_grams > 0)
              },
              fat: {
                ...prev.macros.fat,
                goal: currentGoal.fat_target_grams || 0,
                isSet: !!(currentGoal.fat_target_grams && currentGoal.fat_target_grams > 0)
              },
            }
          }));

          // Now fetch today's consumption
          const today = new Date();
          const dailySummary = await summaryService.getDailySummary(today);

          if (!mounted) return;

          // Update only consumption values
          setSummary(prev => ({
            ...prev,
            calories: {
              ...prev.calories,
              consumed: dailySummary.total_calories || 0,
            },
            macros: {
              protein: {
                ...prev.macros.protein,
                consumed: dailySummary.total_protein || 0,
              },
              carbs: {
                ...prev.macros.carbs,
                consumed: dailySummary.total_carbs || 0,
              },
              fat: {
                ...prev.macros.fat,
                consumed: dailySummary.total_fat || 0,
              },
            }
          }));
        }
      } catch (error) {
        console.error('Error fetching nutrition data:', error);
        setError('Unable to load nutrition data. Please check your connection and try again.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => { mounted = false; };
  }, [token]);

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
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Today's Summary</Title>
          <Text style={{ color: theme.colors.error, textAlign: 'center', marginVertical: 16 }}>
            {error}
          </Text>
          <Button mode="contained" onPress={() => window.location.reload()} style={styles.retryButton}>
            Retry
          </Button>
        </Card.Content>
      </Card>
    );
  }

  // Show message when no goals are set
  if (!hasGoals) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Today's Summary</Title>
          <Text style={styles.noGoalsMessage}>
            You haven't set any nutrition goals yet. Set your goals to start tracking your progress!
          </Text>
          <Button
            mode="contained"
            onPress={navigateToGoals}
            style={styles.setGoalsButton}
          >
            Set Goals
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Today's Summary</Title>

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

        <View style={styles.macrosSection}>
          {(summary.macros.protein.isSet || summary.macros.carbs.isSet || summary.macros.fat.isSet) && (
            <>
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
            </>
          )}
        </View>
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
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
  setGoalsButton: {
    marginTop: 8,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default TodaySummary;