import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Portal, Text, Button, useTheme, Title, Card } from 'react-native-paper';
import { TextInput as RNTextInput } from 'react-native';
import { Food, CreateFoodDTO } from '../../types/Food';
import { foodService } from '../../services/foodService';

interface EditIngredientModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (amount: number, food: Food) => void;
  food: Food | null;
}

export const EditIngredientModal: React.FC<EditIngredientModalProps> = ({
  visible,
  onDismiss,
  onSave,
  food,
}) => {
  const theme = useTheme();
  const [amount, setAmount] = useState('1');
  const [baseServingSize, setBaseServingSize] = useState('');
  const [baseServingUnit, setBaseServingUnit] = useState('');
  const [nutrition, setNutrition] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize values when food changes
  useEffect(() => {
    if (food) {
      setBaseServingSize(food.serving_size?.toString() || '100');
      setBaseServingUnit(food.serving_unit || 'g');
      setNutrition({
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0
      });
    }
  }, [food]);

  // If food is null, don't render the modal
  if (!food) {
    return null;
  }

  const isModified = () => {
    return baseServingSize !== (food.serving_size?.toString() || '100') ||
           baseServingUnit !== (food.serving_unit || 'g') ||
           nutrition.calories !== (food.calories || 0) ||
           nutrition.protein !== (food.protein || 0) ||
           nutrition.carbs !== (food.carbs || 0) ||
           nutrition.fat !== (food.fat || 0);
  };

  const handleSave = async () => {
    if (!food) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    setIsSaving(true);
    try {
      let savedFood = food;

      // If values were modified, we need to save as custom food
      if (isModified()) {
        const foodData: CreateFoodDTO = {
          name: food.name,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          serving_size: parseFloat(baseServingSize),
          serving_unit: baseServingUnit,
          source: 'custom',
          source_id: food.id.toString(),
          brand: food.brand,
          barcode: food.barcode,
        };

        if (food.source === 'custom') {
          // Update existing custom food
          const foodId = Number(food.id);
          if (isNaN(foodId)) {
            throw new Error('Invalid food ID');
          }
          savedFood = await foodService.updateCustomFood(foodId, foodData);
        } else {
          // Create new custom food
          savedFood = await foodService.createCustomFood(foodData);
        }

        // Ensure the saved food has a numeric ID
        const numericId = Number(savedFood.id);
        if (isNaN(numericId)) {
          throw new Error('Invalid food ID returned from server');
        }
        savedFood = {
          ...savedFood,
          id: numericId
        };
      }

      onSave(parsedAmount, savedFood);
      onDismiss();
    } catch (error) {
      console.error('Error saving food:', error);
      // TODO: Show error message to user
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate nutrition based on both base serving size and amount
  const calculatedNutrition = {
    calories: Math.round(nutrition.calories * (parseFloat(amount) || 0)),
    protein: Math.round(nutrition.protein * (parseFloat(amount) || 0) * 10) / 10,
    carbs: Math.round(nutrition.carbs * (parseFloat(amount) || 0) * 10) / 10,
    fat: Math.round(nutrition.fat * (parseFloat(amount) || 0) * 10) / 10,
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onRequestClose={onDismiss}
        transparent
        animationType="fade"
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Card style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={styles.title}>{food.name}</Title>

              <View style={styles.baseServingRow}>
                <Text>Base serving: </Text>
                <RNTextInput
                  value={baseServingSize}
                  onChangeText={setBaseServingSize}
                  keyboardType="decimal-pad"
                  style={styles.baseServingInput}
                />
                <RNTextInput
                  value={baseServingUnit}
                  onChangeText={setBaseServingUnit}
                  style={styles.baseServingUnitInput}
                />
              </View>

              <View style={styles.amountRow}>
                <RNTextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                />
                <Text style={styles.servingText}>serving</Text>
              </View>

              <Text style={styles.nutritionHeader}>
                Nutrition per {amount} serving:
              </Text>

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <RNTextInput
                    value={calculatedNutrition.calories.toString()}
                    onChangeText={(value) => {
                      const newCals = parseFloat(value) || 0;
                      setNutrition(prev => ({
                        ...prev,
                        calories: newCals / (parseFloat(amount) || 1)
                      }));
                    }}
                    keyboardType="decimal-pad"
                    style={styles.nutritionInput}
                  />
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>

                <View style={styles.nutritionItem}>
                  <RNTextInput
                    value={calculatedNutrition.protein.toString()}
                    onChangeText={(value) => {
                      const newProtein = parseFloat(value) || 0;
                      setNutrition(prev => ({
                        ...prev,
                        protein: newProtein / (parseFloat(amount) || 1)
                      }));
                    }}
                    keyboardType="decimal-pad"
                    style={styles.nutritionInput}
                  />
                  <Text style={styles.nutritionLabel}>Protein (g)</Text>
                </View>

                <View style={styles.nutritionItem}>
                  <RNTextInput
                    value={calculatedNutrition.carbs.toString()}
                    onChangeText={(value) => {
                      const newCarbs = parseFloat(value) || 0;
                      setNutrition(prev => ({
                        ...prev,
                        carbs: newCarbs / (parseFloat(amount) || 1)
                      }));
                    }}
                    keyboardType="decimal-pad"
                    style={styles.nutritionInput}
                  />
                  <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                </View>

                <View style={styles.nutritionItem}>
                  <RNTextInput
                    value={calculatedNutrition.fat.toString()}
                    onChangeText={(value) => {
                      const newFat = parseFloat(value) || 0;
                      setNutrition(prev => ({
                        ...prev,
                        fat: newFat / (parseFloat(amount) || 1)
                      }));
                    }}
                    keyboardType="decimal-pad"
                    style={styles.nutritionInput}
                  />
                  <Text style={styles.nutritionLabel}>Fat (g)</Text>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <Button onPress={onDismiss}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isSaving || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
                >
                  Add to Recipe
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    margin: 20,
    width: '90%',
    maxWidth: 400,
    borderRadius: 10,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
  },
  baseServingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  baseServingInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  baseServingUnitInput: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    marginLeft: 0,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  servingText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
  },
  nutritionHeader: {
    fontSize: 14,
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionInput: {
    width: '90%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    textAlign: 'center',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});