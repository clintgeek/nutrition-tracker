import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme, Button } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { RootStackScreenProps } from '../../types/navigation';
import { goalService, Goal } from '../../services/goalService';
import { summaryService, DailySummary } from '../../services/summaryService';
import { useAuth } from '../../contexts/AuthContext';
import { setAuthToken } from '../../services/apiService';
import { SkeletonLoader, LoadingSpinner } from '../common';

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
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();
  const isFocused = useIsFocused();
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

  // Define loadData function
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
      try {
        const currentGoal = await goalService.getCurrentGoal();

        // If no goal exists, that's a valid state, not an error
        if (!currentGoal) {
          setHasGoals(false);
          setIsLoading(false);
          return;
        }

        const hasValidGoals = !!(currentGoal?.daily_calorie_target && currentGoal.daily_calorie_target > 0);
        setHasGoals(hasValidGoals);

        // Fetch today's summary
        const today = new Date();
        const todaySummary = await summaryService.getDailySummary(today);

        // Update the summary state with the fetched data
        setSummary({
          calories: {
            consumed: todaySummary.total_calories || 0,
            goal: currentGoal.daily_calorie_target || 0,
          },
          macros: {
            protein: {
              consumed: todaySummary.total_protein || 0,
              goal: currentGoal.protein_target_grams || 0,
              isSet: !!(currentGoal.protein_target_grams && currentGoal.protein_target_grams > 0)
            },
            carbs: {
              consumed: todaySummary.total_carbs || 0,
              goal: currentGoal.carbs_target_grams || 0,
              isSet: !!(currentGoal.carbs_target_grams && currentGoal.carbs_target_grams > 0)
            },
            fat: {
              consumed: todaySummary.total_fat || 0,
              goal: currentGoal.fat_target_grams || 0,
              isSet: !!(currentGoal.fat_target_grams && currentGoal.fat_target_grams > 0)
            },
          },
        });
      } catch (error: any) {
        // If the error is "No current goal found", that's a valid state
        if (error.response?.data?.message === 'No current goal found') {
          setHasGoals(false);
          setIsLoading(false);
          return;
        }
        // Otherwise, it's a real error
        throw error;
      }
    } catch (error) {
      console.error('Error loading summary data:', error);
      setError('Failed to load summary data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to call loadData when the component mounts or when isFocused changes
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, token]);

  const calculatePercentage = (consumed: number, goal: number) => {
    if (!goal) return 0;
    return Math.min(consumed / goal, 1);
  };

  const navigateToGoals = () => {
    navigation.navigate('NutritionGoals');
  };

  return (
    <Card style={[styles.card, { backgroundColor: '#fff' }]}>
      <Card.Content>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <SkeletonLoader width="80%" height={24} style={styles.skeletonTitle} />
            <SkeletonLoader width="100%" height={20} style={styles.skeletonBar} />
            <View style={styles.macroSkeletonContainer}>
              <SkeletonLoader width="30%" height={18} />
              <SkeletonLoader width="30%" height={18} />
              <SkeletonLoader width="30%" height={18} />
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadData} style={styles.retryButton}>
              Retry
            </Button>
          </View>
        ) : !hasGoals ? (
          <View style={styles.noGoalsContainer}>
            <Text style={styles.noGoalsText}>
              You haven't set any nutrition goals yet.
            </Text>
            <Button
              mode="contained"
              onPress={navigateToGoals}
              style={styles.setGoalsButton}
            >
              Set Goals
            </Button>
          </View>
        ) : (
          <>
            {/* Calories */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Calories</Text>
                <Text style={styles.sectionValue}>
                  {Math.round(summary.calories.consumed)} / {Math.round(summary.calories.goal)} cal
                </Text>
              </View>
              <ProgressBar
                progress={calculatePercentage(summary.calories.consumed, summary.calories.goal)}
                color={theme.colors.primary}
                style={[styles.progressBar, { backgroundColor: '#f5f5f5' }]}
              />
            </View>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              {(summary.macros.protein.isSet || summary.macros.carbs.isSet || summary.macros.fat.isSet) && (
                <>
                  <Text style={styles.macrosTitle}>Macronutrients</Text>

                  {summary.macros.protein.isSet && (
                    <View style={styles.macroItem}>
                      <View style={styles.macroHeader}>
                        <Text style={styles.macroLabel}>Protein</Text>
                        <Text style={styles.macroValue}>
                          {(summary.macros.protein.consumed).toFixed(1)}g / {(summary.macros.protein.goal).toFixed(1)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={calculatePercentage(summary.macros.protein.consumed, summary.macros.protein.goal)}
                        color="#4CAF50"
                        style={[styles.progressBar, { backgroundColor: '#f5f5f5' }]}
                      />
                    </View>
                  )}

                  {summary.macros.carbs.isSet && (
                    <View style={styles.macroItem}>
                      <View style={styles.macroHeader}>
                        <Text style={styles.macroLabel}>Carbs</Text>
                        <Text style={styles.macroValue}>
                          {(summary.macros.carbs.consumed).toFixed(1)}g / {(summary.macros.carbs.goal).toFixed(1)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={calculatePercentage(summary.macros.carbs.consumed, summary.macros.carbs.goal)}
                        color="#FF9800"
                        style={[styles.progressBar, { backgroundColor: '#f5f5f5' }]}
                      />
                    </View>
                  )}

                  {summary.macros.fat.isSet && (
                    <View style={styles.macroItem}>
                      <View style={styles.macroHeader}>
                        <Text style={styles.macroLabel}>Fat</Text>
                        <Text style={styles.macroValue}>
                          {(summary.macros.fat.consumed).toFixed(1)}g / {(summary.macros.fat.goal).toFixed(1)}g
                        </Text>
                      </View>
                      <ProgressBar
                        progress={calculatePercentage(summary.macros.fat.consumed, summary.macros.fat.goal)}
                        color="#E91E63"
                        style={[styles.progressBar, { backgroundColor: '#f5f5f5' }]}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </>
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
  loadingContainer: {
    padding: 16,
  },
  skeletonTitle: {
    marginBottom: 16,
  },
  skeletonBar: {
    marginBottom: 12,
  },
  macroSkeletonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  errorContainer: {
    padding: 16,
  },
  errorText: {
    color: '#f00',
    marginBottom: 16,
  },
  noGoalsContainer: {
    padding: 16,
  },
  noGoalsText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionValue: {
    fontSize: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  macrosContainer: {
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
  setGoalsButton: {
    marginTop: 8,
  },
  retryButton: {
    marginTop: 8,
  },
});

export default TodaySummary;