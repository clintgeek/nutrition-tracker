import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import {
  Portal,
  Dialog,
  Button,
  Text,
  useTheme,
  Divider,
} from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { Food } from '../../types/Food';
import { foodLogService } from '../../services/foodLogService';
import { foodService } from '../../services/foodService';

// Helper function to round to nearest 0.5
const roundToNearestHalf = (value: number): number => {
  return Math.round(value * 2) / 2;
};

// Helper function to capitalize food name
const capitalizeFoodName = (name: string): string => {
  return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const AddFoodToLogModal: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { food: initialFood, mealType: initialMealType, date: initialDate } = (route.params as { food: Food; mealType?: string; date?: string }) || {};

  const styles = StyleSheet.create({
    dialog: {
      maxHeight: '80%',
      backgroundColor: theme.colors.surface,
    },
    content: {
      padding: 16,
    },
    servingsGroup: {
      marginBottom: 16,
    },
    servingDetailsGroup: {
      marginBottom: 16,
    },
    mealDetailsGroup: {
      marginBottom: 16,
    },
    mealTypeSection: {
      marginBottom: 16,
    },
    dateSection: {
      marginBottom: 16,
    },
    sectionLabel: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 8,
      backgroundColor: theme.colors.background,
    },
    mealTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealTypeButton: {
      flex: 1,
      minWidth: '45%',
    },
    divider: {
      marginVertical: 16,
    },
    nutritionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.onSurface,
    },
    nutritionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    nutritionItem: {
      flex: 1,
      alignItems: 'center',
    },
    nutritionLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    nutritionInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 4,
      textAlign: 'center',
      width: '100%',
      backgroundColor: theme.colors.background,
    },
    servingContainer: {
      flexDirection: 'row',
    },
    servingSizeContainer: {
      flex: 2,
      marginRight: 8,
    },
    servingUnitContainer: {
      flex: 1,
    },
    servingSizeInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 8,
      backgroundColor: theme.colors.background,
    },
    servingUnitInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 8,
      backgroundColor: theme.colors.background,
    },
    dateInput: {
      backgroundColor: theme.colors.background,
    },
  });

  const [food, setFood] = useState<Food>({
    ...initialFood,
    name: capitalizeFoodName(initialFood.name)
  });
  const [servings, setServings] = useState('1');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(initialMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' || 'snack');
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ? new Date(initialDate) : new Date());
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Update date state when selectedDate changes
  useEffect(() => {
    setDate(selectedDate.toISOString().split('T')[0]);
  }, [selectedDate]);

  // Calculate nutrition values based on servings
  const calculateNutrition = (value: number, isCalories: boolean = false) => {
    const servingsNum = parseFloat(servings) || 1;
    // Use Math.round for calories, roundToNearestHalf for other nutrients
    return isCalories ?
      Math.round(value * servingsNum) :
      roundToNearestHalf(value * servingsNum);
  };

  // Handle nutrition value changes
  const handleNutritionChange = (field: keyof Food, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Use Math.round for calories, roundToNearestHalf for other nutrients
    const processedValue = field === 'calories' ?
      Math.round(numValue) :
      roundToNearestHalf(numValue);
    setFood(prev => ({ ...prev, [field]: processedValue }));
    setIsCustom(true);
  };

  // Handle adding food to log
  const handleAddToLog = async () => {
    try {
      setIsLoading(true);
      let foodToLog = food;

      // If nutrition values were modified, save as custom food
      if (isCustom) {
        const customFood = {
          ...food,
          name: capitalizeFoodName(food.name),
          source: 'custom' as const,
          serving_size: food.serving_size,
          serving_unit: food.serving_unit,
          calories: roundToNearestHalf(food.calories),
          protein: roundToNearestHalf(food.protein),
          carbs: roundToNearestHalf(food.carbs),
          fat: roundToNearestHalf(food.fat),
        };

        if (food.is_custom) {
          // Update existing custom food
          await foodService.updateCustomFood(Number(food.id), customFood);
          foodToLog = { ...foodToLog, name: capitalizeFoodName(food.name) };
        } else {
          // Create new custom food
          const newFood = await foodService.createCustomFood(customFood);
          foodToLog = newFood;
        }
      }

      await foodLogService.createLog({
        food_item_id: Number(foodToLog.id),
        servings: parseFloat(servings),
        meal_type: mealType,
        log_date: date,
        food_item: {
          ...foodToLog,
          name: capitalizeFoodName(foodToLog.name)
        },
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error adding food to log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={true} onDismiss={() => navigation.goBack()} style={styles.dialog}>
        <Dialog.Title>Add {capitalizeFoodName(food.name)} to Log</Dialog.Title>
        <Dialog.Content>
          <ScrollView>
            <View style={styles.content}>
              <View style={styles.servingsGroup}>
                <Text style={styles.sectionLabel}>Servings</Text>
                <TextInput
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>

              <View style={styles.servingDetailsGroup}>
                <Text style={styles.sectionLabel}>Serving Size</Text>
                <View style={styles.servingContainer}>
                  <View style={styles.servingSizeContainer}>
                    <TextInput
                      value={food.serving_size?.toString() || '100'}
                      onChangeText={(value) => {
                        setFood(prev => ({ ...prev, serving_size: parseFloat(value) || 100 }));
                        setIsCustom(true);
                      }}
                      keyboardType="numeric"
                      style={styles.servingSizeInput}
                    />
                  </View>
                  <View style={styles.servingUnitContainer}>
                    <TextInput
                      value={food.serving_unit || ''}
                      onChangeText={(value) => {
                        setFood(prev => ({ ...prev, serving_unit: value }));
                        setIsCustom(true);
                      }}
                      style={styles.servingUnitInput}
                      placeholder="g"
                    />
                  </View>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.mealDetailsGroup}>
                <View style={styles.mealTypeSection}>
                  <Text style={styles.sectionLabel}>Meal Type</Text>
                  <View style={styles.mealTypeContainer}>
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                      <Button
                        key={type}
                        mode={mealType === type ? 'contained' : 'outlined'}
                        onPress={() => setMealType(type)}
                        style={styles.mealTypeButton}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </View>
                </View>

                <View style={styles.dateSection}>
                  <Text style={styles.sectionLabel}>Date</Text>
                  <DatePickerInput
                    locale="en-GB"
                    label="Date"
                    value={selectedDate}
                    onChange={(d) => d && setSelectedDate(d)}
                    inputMode="start"
                    mode="flat"
                    style={styles.dateInput}
                    withDateFormatInLabel={false}
                  />
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text style={styles.nutritionTitle}>Nutrition Information</Text>
              <View style={styles.nutritionContainer}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <TextInput
                    value={calculateNutrition(food.calories, true).toString()}
                    onChangeText={(value) => handleNutritionChange('calories', value)}
                    keyboardType="numeric"
                    style={styles.nutritionInput}
                  />
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                  <TextInput
                    value={calculateNutrition(food.protein).toString()}
                    onChangeText={(value) => handleNutritionChange('protein', value)}
                    keyboardType="numeric"
                    style={styles.nutritionInput}
                  />
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                  <TextInput
                    value={calculateNutrition(food.carbs).toString()}
                    onChangeText={(value) => handleNutritionChange('carbs', value)}
                    keyboardType="numeric"
                    style={styles.nutritionInput}
                  />
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                  <TextInput
                    value={calculateNutrition(food.fat).toString()}
                    onChangeText={(value) => handleNutritionChange('fat', value)}
                    keyboardType="numeric"
                    style={styles.nutritionInput}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => navigation.goBack()}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleAddToLog}
            loading={isLoading}
            disabled={isLoading}
          >
            Add to Log
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default AddFoodToLogModal;