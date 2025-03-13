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

  const [food, setFood] = useState<Food>({
    ...initialFood,
    name: capitalizeFoodName(initialFood.name)
  });
  const [servings, setServings] = useState('1');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(initialMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' || 'snack');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Calculate nutrition values based on servings
  const calculateNutrition = (value: number) => {
    const servingsNum = parseFloat(servings) || 1;
    return roundToNearestHalf(value * servingsNum);
  };

  // Handle nutrition value changes
  const handleNutritionChange = (field: keyof Food, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFood(prev => ({ ...prev, [field]: roundToNearestHalf(numValue) }));
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
          source: 'custom',
          serving_size: food.serving_size,
          serving_unit: food.serving_unit,
          // Round all nutrition values to nearest 0.5
          calories: roundToNearestHalf(food.calories),
          protein: roundToNearestHalf(food.protein),
          carbs: roundToNearestHalf(food.carbs),
          fat: roundToNearestHalf(food.fat),
        };

        if (food.is_custom) {
          // Update existing custom food
          await foodService.updateCustomFood(parseInt(food.id), customFood);
          foodToLog = { ...foodToLog, name: capitalizeFoodName(food.name) };
        } else {
          // Create new custom food
          const newFood = await foodService.createCustomFood(customFood);
          foodToLog = newFood;
        }
      }

      await foodLogService.createLog({
        food_item_id: parseInt(foodToLog.id),
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
              <Text style={styles.label}>Servings</Text>
              <TextInput
                value={servings}
                onChangeText={setServings}
                keyboardType="decimal-pad"
                style={styles.input}
              />

              <Text style={styles.label}>Meal Type</Text>
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

              <Text style={styles.label}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                style={styles.input}
              />

              <Divider style={styles.divider} />

              <Text style={styles.nutritionTitle}>Nutrition Information</Text>
              <View style={styles.nutritionContainer}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                  <TextInput
                    value={calculateNutrition(food.calories).toString()}
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

              <Text style={styles.servingInfo}>
                Serving size: {food.serving_size} {food.serving_unit}
              </Text>
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

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  mealTypeButton: {
    margin: 4,
  },
  divider: {
    marginVertical: 16,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  nutritionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 4,
    textAlign: 'center',
    width: '80%',
  },
  servingInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default AddFoodToLogModal;