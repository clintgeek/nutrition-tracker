import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput, Alert } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Divider,
  useTheme,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { goalService } from '../../services/goalService';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

// Goal types
type GoalType = 'calories' | 'macros';

// Macro goals interface
interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

const NutritionGoalsContent: React.FC = () => {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const navigation = useNavigation();

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
        } else if ((currentGoal.protein_target_grams > 0 ||
                   currentGoal.carbs_target_grams > 0 ||
                   currentGoal.fat_target_grams > 0)) {
          // This is a macro-based goal
          setGoalType('macros');
          setMacroGoals({
            protein: currentGoal.protein_target_grams || 0,
            carbs: currentGoal.carbs_target_grams || 0,
            fat: currentGoal.fat_target_grams || 0
          });

          // Set calorie goal if available, otherwise use default
          if (currentGoal.daily_calorie_target) {
            setCalorieGoal(currentGoal.daily_calorie_target.toString());
          } else {
            setCalorieGoal('2000');
          }
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

      // Prepare goal data based on goal type
      let goalData: any = {
        start_date: new Date().toISOString().split('T')[0], // Today's date
      };

      if (goalType === 'calories') {
        // For calorie goals, set macro values to 0 (not null)
        goalData = {
          ...goalData,
          daily_calorie_target: parseInt(calorieGoal) || 0,
          protein_target_grams: 0,
          carbs_target_grams: 0,
          fat_target_grams: 0,
        };
      } else {
        // For macro goals, calculate macros in grams
        const macrosInGrams = calculateCaloriesFromMacros();

        // For macro goals, calorie value is optional but must be a number
        goalData = {
          ...goalData,
          daily_calorie_target: calorieGoal.trim() !== '' ? parseInt(calorieGoal) : 0,
          protein_target_grams: macrosInGrams.protein,
          carbs_target_grams: macrosInGrams.carbs,
          fat_target_grams: macrosInGrams.fat,
        };
      }

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
    const calorieValue = parseInt(calorieGoal) || 2000; // Default to 2000 if empty
    const proteinCalories = (calorieValue * macroGoals.protein / 100);
    const carbCalories = (calorieValue * macroGoals.carbs / 100);
    const fatCalories = (calorieValue * macroGoals.fat / 100);

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
      <View style={styles(theme).loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16, color: theme.colors.onBackground }}>Loading goals...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles(theme).container}>
      <View style={styles(theme).content}>
        <Card style={styles(theme).card}>
          <Card.Content>
            <Title style={{ marginBottom: 16, color: theme.colors.onSurface }}>Nutrition Goals</Title>

            <Text style={styles(theme).sectionTitle}>Goal Type</Text>
            <View style={styles(theme).goalTypeContainer}>
              <TouchableOpacity
                style={[
                  styles(theme).goalTypeButton,
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
                  styles(theme).goalTypeText,
                  goalType === 'calories' && { color: 'white' }
                ]}>
                  Calories
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles(theme).goalTypeButton,
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
                  styles(theme).goalTypeText,
                  goalType === 'macros' && { color: 'white' }
                ]}>
                  Macros
                </Text>
              </TouchableOpacity>
            </View>

            <Divider style={{ marginVertical: 16 }} />

            <Text style={styles(theme).sectionTitle}>Daily Calorie Target</Text>
            <View style={styles(theme).inputContainer}>
              <RNTextInput
                style={styles(theme).input}
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType="numeric"
                placeholder={goalType === 'macros' ? "Optional calorie target" : "Enter daily calorie target"}
              />
              <Text style={styles(theme).inputLabel}>calories</Text>
            </View>

            {goalType === 'macros' && (
              <>
                <Divider style={{ marginVertical: 16 }} />

                <Text style={styles(theme).sectionTitle}>Macro Nutrient Targets</Text>
                <Text style={styles(theme).description}>
                  Set your macronutrient targets as percentages of your daily calorie goal.
                </Text>

                <View style={styles(theme).macroContainer}>
                  <View style={styles(theme).macroItem}>
                    <Text style={styles(theme).macroLabel}>Protein</Text>
                    <View style={styles(theme).macroInputContainer}>
                      <RNTextInput
                        style={styles(theme).macroInput}
                        value={macroGoals.protein.toString()}
                        onChangeText={(value) => updateMacroGoal('protein', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles(theme).macroUnit}>%</Text>
                    </View>
                    <Text style={styles(theme).macroGrams}>{macrosInGrams.protein}g</Text>
                  </View>

                  <View style={styles(theme).macroItem}>
                    <Text style={styles(theme).macroLabel}>Carbs</Text>
                    <View style={styles(theme).macroInputContainer}>
                      <RNTextInput
                        style={styles(theme).macroInput}
                        value={macroGoals.carbs.toString()}
                        onChangeText={(value) => updateMacroGoal('carbs', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles(theme).macroUnit}>%</Text>
                    </View>
                    <Text style={styles(theme).macroGrams}>{macrosInGrams.carbs}g</Text>
                  </View>

                  <View style={styles(theme).macroItem}>
                    <Text style={styles(theme).macroLabel}>Fat</Text>
                    <View style={styles(theme).macroInputContainer}>
                      <RNTextInput
                        style={styles(theme).macroInput}
                        value={macroGoals.fat.toString()}
                        onChangeText={(value) => updateMacroGoal('fat', value)}
                        keyboardType="numeric"
                      />
                      <Text style={styles(theme).macroUnit}>%</Text>
                    </View>
                    <Text style={styles(theme).macroGrams}>{macrosInGrams.fat}g</Text>
                  </View>
                </View>

                {totalPercentage !== 100 && (
                  <Text style={[styles(theme).totalPercentage, { color: theme.colors.error }]}>
                    Total: {totalPercentage}% (should be 100%)
                  </Text>
                )}

                {totalPercentage === 100 && (
                  <Text style={styles(theme).totalPercentage}>
                    Total: {totalPercentage}%
                  </Text>
                )}
              </>
            )}

            <Button
              mode="contained"
              onPress={saveGoals}
              style={styles(theme).saveButton}
              disabled={saving || (goalType === 'macros' && totalPercentage !== 100) || (goalType === 'calories' && !calorieGoal)}
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

const NutritionGoalsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const handleTabPress = (screenName: string) => {
    navigation.navigate('MainTabs', { screen: screenName });
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Goals"
        component={NutritionGoalsContent}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" color={color} size={size} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Log"
        component={NutritionGoalsContent}
        options={{
          tabBarLabel: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleTabPress('Log');
          },
        }}
      />
      <Tab.Screen
        name="Food"
        component={NutritionGoalsContent}
        options={{
          tabBarLabel: 'Foods',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food" color={color} size={size} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleTabPress('Food');
          },
        }}
      />
      <Tab.Screen
        name="Recipe"
        component={NutritionGoalsContent}
        options={{
          tabBarLabel: 'Recipes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open" color={color} size={size} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleTabPress('Recipe');
          },
        }}
      />
      <Tab.Screen
        name="MealPlanner"
        component={NutritionGoalsContent}
        options={{
          tabBarLabel: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleTabPress('MealPlanner');
          },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  description: {
    marginBottom: 16,
    opacity: 0.7,
    color: theme.colors.onSurfaceVariant,
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
    borderColor: theme.colors.outline,
    backgroundColor: theme.colors.surface,
  },
  goalTypeText: {
    marginLeft: 8,
    fontWeight: '500',
    color: theme.colors.onSurface,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    backgroundColor: theme.colors.background,
    color: theme.colors.onBackground,
  },
  inputLabel: {
    width: 80,
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurface,
  },
  macroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  macroInput: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
    backgroundColor: theme.colors.background,
    color: theme.colors.onBackground,
  },
  macroUnit: {
    marginLeft: 4,
    width: 20,
    color: theme.colors.onSurfaceVariant,
  },
  macroGrams: {
    width: 60,
    textAlign: 'right',
    color: theme.colors.onSurfaceVariant,
  },
  totalPercentage: {
    marginTop: 8,
    fontWeight: 'bold',
    textAlign: 'right',
    color: theme.colors.onSurface,
  },
  saveButton: {
    marginTop: 24,
  },
});

export default NutritionGoalsScreen;