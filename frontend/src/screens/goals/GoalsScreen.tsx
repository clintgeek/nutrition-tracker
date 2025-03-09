import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput, Alert } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Divider,
  Switch,
  useTheme,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { goalService } from '../../services/goalService';
import { useIsFocused } from '@react-navigation/native';

// Goal types
type GoalType = 'calories' | 'macros';

// Macro goals interface
interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

const GoalsScreen: React.FC = () => {
  const theme = useTheme();
  const isFocused = useIsFocused();

  // State for goal type (calories or macros)
  const [goalType, setGoalType] = useState<GoalType>('calories');

  // State for calorie goal
  const [calorieGoal, setCalorieGoal] = useState('2000');

  // State for macro goals
  const [macroGoals, setMacroGoals] = useState<MacroGoals>({
    protein: 30, // percentage
    carbs: 40,   // percentage
    fat: 30      // percentage
  });

  // State for loading
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentGoalId, setCurrentGoalId] = useState<number | null>(null);

  // Load saved goals on component mount or when screen is focused
  useEffect(() => {
    loadGoals();
  }, [isFocused]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      // Load current goal from API
      const currentGoal = await goalService.getCurrentGoal();

      if (currentGoal) {
        // Set goal ID for updates
        setCurrentGoalId(currentGoal.id || null);

        // Determine goal type based on the goal data
        if (currentGoal.daily_calorie_target > 0 &&
            (!currentGoal.protein_target_grams || currentGoal.protein_target_grams === 0) &&
            (!currentGoal.carbs_target_grams || currentGoal.carbs_target_grams === 0) &&
            (!currentGoal.fat_target_grams || currentGoal.fat_target_grams === 0)) {
          // This is a calorie-only goal
          setGoalType('calories');
          setCalorieGoal(currentGoal.daily_calorie_target.toString());
        } else if ((!currentGoal.daily_calorie_target || currentGoal.daily_calorie_target === 0) &&
                  (currentGoal.protein_target_grams > 0 ||
                   currentGoal.carbs_target_grams > 0 ||
                   currentGoal.fat_target_grams > 0)) {
          // This is a macro-only goal
          setGoalType('macros');
          setMacroGoals({
            protein: currentGoal.protein_target_grams || 0,
            carbs: currentGoal.carbs_target_grams || 0,
            fat: currentGoal.fat_target_grams || 0
          });

          // Set a default calorie goal for calculations
          setCalorieGoal('2000');
        }
      }
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'Failed to load goals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save goals to backend
  const saveGoals = async () => {
    try {
      setSaving(true);

      // Calculate macros in grams if using macros goal type
      const macrosInGrams = calculateCaloriesFromMacros();

      // Prepare goal data based on goal type
      const goalData = {
        daily_calorie_target: parseInt(calorieGoal),
        protein_target_grams: goalType === 'macros' ? macrosInGrams.protein : Math.round(parseInt(calorieGoal) * 0.3 / 4),
        carbs_target_grams: goalType === 'macros' ? macrosInGrams.carbs : Math.round(parseInt(calorieGoal) * 0.4 / 4),
        fat_target_grams: goalType === 'macros' ? macrosInGrams.fat : Math.round(parseInt(calorieGoal) * 0.3 / 9),
        start_date: new Date().toISOString().split('T')[0], // Today's date
      };

      console.log('Saving goal data:', goalData);

      // If we have an existing goal, update it
      if (currentGoalId) {
        await goalService.updateGoal(currentGoalId, goalData);
      } else {
        // Otherwise create a new goal
        const newGoal = await goalService.createGoal(goalData);
        if (newGoal && newGoal.id) {
          setCurrentGoalId(newGoal.id);
        }
      }

      // Show success message
      Alert.alert('Success', 'Goals saved successfully!');
    } catch (error) {
      console.error('Error saving goals:', error);
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Update macro goal
  const updateMacroGoal = (type: keyof MacroGoals, value: string) => {
    const numValue = parseInt(value) || 0;
    setMacroGoals(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  // Calculate calories from macros
  const calculateCaloriesFromMacros = () => {
    const proteinCalories = (parseInt(calorieGoal) * macroGoals.protein / 100);
    const carbCalories = (parseInt(calorieGoal) * macroGoals.carbs / 100);
    const fatCalories = (parseInt(calorieGoal) * macroGoals.fat / 100);

    return {
      protein: Math.round(proteinCalories / 4), // 4 calories per gram of protein
      carbs: Math.round(carbCalories / 4),      // 4 calories per gram of carbs
      fat: Math.round(fatCalories / 9)          // 9 calories per gram of fat
    };
  };

  // Calculate total percentage
  const totalPercentage = macroGoals.protein + macroGoals.carbs + macroGoals.fat;

  // Calculate macros in grams
  const macrosInGrams = calculateCaloriesFromMacros();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={{ marginBottom: 16 }}>Nutrition Goals</Title>

            <Text style={styles.sectionTitle}>Goal Type</Text>
            <View style={styles.goalTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.goalTypeButton,
                  goalType === 'calories' && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setGoalType('calories')}
              >
                <MaterialCommunityIcons
                  name="fire"
                  size={20}
                  color={goalType === 'calories' ? 'white' : theme.colors.primary}
                />
                <Text style={[
                  styles.goalTypeText,
                  goalType === 'calories' && { color: 'white' }
                ]}>
                  Calories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.goalTypeButton,
                  goalType === 'macros' && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setGoalType('macros')}
              >
                <MaterialCommunityIcons
                  name="chart-pie"
                  size={20}
                  color={goalType === 'macros' ? 'white' : theme.colors.primary}
                />
                <Text style={[
                  styles.goalTypeText,
                  goalType === 'macros' && { color: 'white' }
                ]}>
                  Macros
                </Text>
              </TouchableOpacity>
            </View>

            <Divider style={{ marginVertical: 16 }} />

            <Text style={styles.sectionTitle}>Daily Calorie Target</Text>
            <View style={styles.inputContainer}>
              <RNTextInput
                style={styles.input}
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType="numeric"
                placeholder="Enter daily calorie target"
              />
              <Text style={styles.inputLabel}>calories</Text>
            </View>

            {goalType === 'macros' && (
              <>
                <Divider style={{ marginVertical: 16 }} />

                <Text style={styles.sectionTitle}>Macro Nutrient Targets</Text>
                <Text style={styles.description}>
                  Set your macronutrient targets as percentages of your daily calorie goal.
                </Text>

                <View style={styles.macroContainer}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <View style={styles.macroInputContainer}>
                      <RNTextInput
                        style={styles.macroInput}
                        value={macroGoals.protein.toString()}
                        onChangeText={(value) => updateMacroGoal('protein', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.macroUnit}>%</Text>
                    </View>
                    <Text style={styles.macroGrams}>{macrosInGrams.protein}g</Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <View style={styles.macroInputContainer}>
                      <RNTextInput
                        style={styles.macroInput}
                        value={macroGoals.carbs.toString()}
                        onChangeText={(value) => updateMacroGoal('carbs', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.macroUnit}>%</Text>
                    </View>
                    <Text style={styles.macroGrams}>{macrosInGrams.carbs}g</Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Fat</Text>
                    <View style={styles.macroInputContainer}>
                      <RNTextInput
                        style={styles.macroInput}
                        value={macroGoals.fat.toString()}
                        onChangeText={(value) => updateMacroGoal('fat', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles.macroUnit}>%</Text>
                    </View>
                    <Text style={styles.macroGrams}>{macrosInGrams.fat}g</Text>
                  </View>
                </View>

                {totalPercentage !== 100 && (
                  <Text style={[styles.totalPercentage, { color: theme.colors.error }]}>
                    Total: {totalPercentage}% (should be 100%)
                  </Text>
                )}

                {totalPercentage === 100 && (
                  <Text style={styles.totalPercentage}>
                    Total: {totalPercentage}%
                  </Text>
                )}
              </>
            )}

            <Button
              mode="contained"
              onPress={saveGoals}
              style={styles.saveButton}
              disabled={saving || (goalType === 'macros' && totalPercentage !== 100)}
              loading={saving}
            >
              Save Goals
            </Button>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
  },
  goalTypeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  goalTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  goalTypeText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  inputLabel: {
    width: 80,
  },
  macroContainer: {
    marginTop: 8,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  macroLabel: {
    width: 80,
  },
  macroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  macroInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
  },
  macroUnit: {
    marginLeft: 4,
    width: 20,
  },
  macroGrams: {
    width: 60,
    textAlign: 'right',
  },
  totalPercentage: {
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  saveButton: {
    marginTop: 24,
  },
});

export default GoalsScreen;
