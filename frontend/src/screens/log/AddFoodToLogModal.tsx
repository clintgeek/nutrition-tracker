import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import {
  Portal,
  Dialog,
  Button,
  Text,
  useTheme,
  Divider,
  Chip,
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
    scrollArea: {
      paddingHorizontal: 0,
    },
    content: {
      padding: 16,
    },
    foodName: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 24,
      textAlign: 'center',
    },
    servingsGroup: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.onSurface,
      fontWeight: '500',
    },
    servingsInput: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      backgroundColor: theme.colors.background,
    },
    servingSizeContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
    },
    servingSizeInput: {
      flex: 2,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      backgroundColor: theme.colors.background,
    },
    servingUnitInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      backgroundColor: theme.colors.background,
    },
    mealTypeGroup: {
      marginBottom: 24,
    },
    mealTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealTypeChip: {
      minWidth: '45%',
      marginBottom: 8,
    },
    mealTypeText: {
      fontSize: 14,
    },
    dateGroup: {
      marginBottom: 24,
    },
    dateInput: {
      backgroundColor: theme.colors.background,
    },
    divider: {
      marginVertical: 16,
    },
    nutritionGroup: {
      marginTop: 8,
    },
    nutritionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    nutritionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    nutritionItem: {
      alignItems: 'center',
      minWidth: '25%',
    },
    nutritionValue: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    nutritionLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    nutritionInput: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 20,
      fontWeight: '600',
      backgroundColor: theme.colors.background,
      textAlign: 'center',
      color: theme.colors.onSurface,
      marginBottom: 4,
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
    return isCalories ?
      Math.round(value * servingsNum) :
      roundToNearestHalf(value * servingsNum);
  };

  // Add back the nutrition change handler
  const handleNutritionChange = (field: keyof Food, value: string) => {
    const numValue = parseFloat(value) || 0;
    const processedValue = field === 'calories' ?
      Math.round(numValue) :
      roundToNearestHalf(numValue);
    setFood(prev => ({ ...prev, [field]: processedValue }));
    setIsCustom(true);
  };

  // State for displayed nutrition values
  const [displayNutrition, setDisplayNutrition] = useState({
    calories: food.calories || 0,
    protein: food.protein || 0,
    carbs: food.carbs || 0,
    fat: food.fat || 0
  });

  // Update displayed nutrition when servings change
  useEffect(() => {
    setDisplayNutrition({
      calories: calculateNutrition(food.calories || 0, true),
      protein: calculateNutrition(food.protein || 0),
      carbs: calculateNutrition(food.carbs || 0),
      fat: calculateNutrition(food.fat || 0)
    });
  }, [servings, food]);

  // Update the handleAddToLog function to not include serving size/unit in calculations
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
          calories: roundToNearestHalf(food.calories),
          protein: roundToNearestHalf(food.protein),
          carbs: roundToNearestHalf(food.carbs),
          fat: roundToNearestHalf(food.fat),
          // Keep serving size/unit as decorative metadata
          serving_size: food.serving_size,
          serving_unit: food.serving_unit,
        };

        // If it's already a custom food and has a valid ID, update it
        if (food.is_custom && food.id && !isNaN(Number(food.id))) {
          await foodService.updateCustomFood(Number(food.id), customFood);
          foodToLog = { ...foodToLog, name: capitalizeFoodName(food.name) };
        } else {
          // Otherwise create a new custom food
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
        <Dialog.Title>Add {capitalizeFoodName(food.name)}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            <View style={styles.content}>
              {/* Servings Input */}
              <View style={styles.servingsGroup}>
                <Text style={styles.sectionLabel}>Servings</Text>
                <TextInput
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="decimal-pad"
                  style={styles.servingsInput}
                  maxLength={4}
                />
              </View>

              {/* Serving Size and Unit */}
              <View style={styles.servingsGroup}>
                <Text style={styles.sectionLabel}>Serving Size</Text>
                <View style={styles.servingSizeContainer}>
                  <TextInput
                    value={food.serving_size?.toString()}
                    onChangeText={(value) => {
                      setFood(prev => ({
                        ...prev,
                        serving_size: parseFloat(value) || prev.serving_size
                      }));
                      setIsCustom(true);
                    }}
                    keyboardType="decimal-pad"
                    style={styles.servingSizeInput}
                    maxLength={4}
                    placeholder="100"
                  />
                  <TextInput
                    value={food.serving_unit}
                    onChangeText={(value) => {
                      setFood(prev => ({
                        ...prev,
                        serving_unit: value || prev.serving_unit
                      }));
                      setIsCustom(true);
                    }}
                    style={styles.servingUnitInput}
                    maxLength={10}
                    placeholder="g"
                  />
                </View>
              </View>

              {/* Date Selection */}
              <View style={styles.dateGroup}>
                <Text style={styles.sectionLabel}>Date</Text>
                <DatePickerInput
                  locale="en"
                  value={selectedDate}
                  onChange={(d: Date | undefined) => d && setSelectedDate(d)}
                  inputMode="start"
                  style={styles.dateInput}
                />
              </View>

              {/* Nutrition Summary */}
              <View style={styles.nutritionGroup}>
                <Text style={styles.nutritionTitle}>
                  Nutrition for {parseFloat(servings) || 1} {parseFloat(servings) === 1 ? 'serving' : 'servings'}
                </Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <TextInput
                      value={displayNutrition.calories.toString() || '0'}
                      onChangeText={(value) => {
                        const baseValue = parseFloat(value) / (parseFloat(servings) || 1);
                        handleNutritionChange('calories', baseValue.toString());
                      }}
                      keyboardType="decimal-pad"
                      style={styles.nutritionInput}
                      maxLength={4}
                    />
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <TextInput
                      value={displayNutrition.protein.toString() || '0'}
                      onChangeText={(value) => {
                        const baseValue = parseFloat(value) / (parseFloat(servings) || 1);
                        handleNutritionChange('protein', baseValue.toString());
                      }}
                      keyboardType="decimal-pad"
                      style={styles.nutritionInput}
                      maxLength={4}
                    />
                    <Text style={styles.nutritionLabel}>Protein (g)</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <TextInput
                      value={displayNutrition.carbs.toString() || '0'}
                      onChangeText={(value) => {
                        const baseValue = parseFloat(value) / (parseFloat(servings) || 1);
                        handleNutritionChange('carbs', baseValue.toString());
                      }}
                      keyboardType="decimal-pad"
                      style={styles.nutritionInput}
                      maxLength={4}
                    />
                    <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <TextInput
                      value={displayNutrition.fat.toString() || '0'}
                      onChangeText={(value) => {
                        const baseValue = parseFloat(value) / (parseFloat(servings) || 1);
                        handleNutritionChange('fat', baseValue.toString());
                      }}
                      keyboardType="decimal-pad"
                      style={styles.nutritionInput}
                      maxLength={4}
                    />
                    <Text style={styles.nutritionLabel}>Fat (g)</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>

        {/* Action Buttons */}
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