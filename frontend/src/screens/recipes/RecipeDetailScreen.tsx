import React, { useEffect, useState, ReactNode } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import type { RouteProp } from '@react-navigation/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, Portal, FAB, Card, Title } from 'react-native-paper';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Recipe, RecipeIngredient, RecipeStep, CreateRecipeDTO, CreateRecipeStepDTO } from '../../types/Recipe';
import { RecipeStackParamList } from '../../types/navigation';
import { recipeService } from '../../services/recipeService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { formatNumber } from '../../utils/formatters';
import { Icon } from '@rneui/themed';
import { EditIngredientModal } from '../../components/recipes/EditIngredientModal';
import { Food } from '../../types/Food';
import { v4 as uuidv4 } from 'uuid';

type RecipeDetailScreenRouteProp = RouteProp<RecipeStackParamList, 'RecipeDetail'>;
type RecipeDetailScreenNavigationProp = NativeStackNavigationProp<RecipeStackParamList>;

type Ingredient = CreateRecipeDTO['ingredients'][0];
type Step = CreateRecipeDTO['steps'][0];

interface ExtendedCreateRecipeDTO extends CreateRecipeDTO {
  steps: Array<{
    description: string;
    order: number;
  }>;
}

interface FormState {
  name: string;
  description: string;
  servings: number;
  ingredients: Array<{
    food_item_id: number;
    amount: number;
    unit: string;
  }>;
  steps: Array<{
    description: string;
    order: number;
  }>;
}

type DraggableIngredient = RecipeIngredient & { order_index: number };
type DraggableStep = RecipeStep & { order: number };

export function RecipeDetailScreen() {
  const navigation = useNavigation<RecipeDetailScreenNavigationProp>();
  const route = useRoute<RecipeDetailScreenRouteProp>();
  const theme = useTheme();
  const recipeId = route.params?.recipeId;
  const isNew = recipeId === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [form, setForm] = useState<ExtendedCreateRecipeDTO>({
    name: '',
    description: '',
    servings: 1,
    ingredients: [],
    steps: []
  });
  const [selectedIngredient, setSelectedIngredient] = useState<Food | null>(null);
  const [showEditIngredientModal, setShowEditIngredientModal] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadRecipe();
    } else {
      setLoading(false);
    }
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recipeService.getRecipe(Number(recipeId));
      setRecipe(data);
      setIngredients(data.ingredients || []);
      setForm({
        name: data.name,
        description: data.description || '',
        servings: data.servings,
        ingredients: data.ingredients?.map(ing => ({
          food_item_id: ing.food_item_id,
          amount: ing.amount,
          unit: ing.unit,
          order_index: ing.order_index
        })) || [],
        steps: data.steps?.map(step => ({
          description: step.description,
          order: step.order
        })) || []
      });
    } catch (err) {
      setError('Failed to load recipe');
      console.error('Error loading recipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate form
      if (!form.name.trim()) {
        setError('Recipe name is required');
        return;
      }

      if (form.servings <= 0) {
        setError('Servings must be a positive number');
        return;
      }

      if (!form.ingredients.length) {
        setError('Recipe must have at least one ingredient');
        return;
      }

      // Create or update recipe
      if (isNew) {
        await recipeService.createRecipe(form);
        Alert.alert(
          'Success',
          'Recipe saved successfully! It has been automatically added to your food list.',
          [
            {
              text: 'View Foods',
              onPress: () => navigation.navigate('FoodList')
            },
            { text: 'OK', style: 'default' }
          ]
        );
        navigation.goBack();
      } else {
        await recipeService.updateRecipe(Number(recipeId), form);
        Alert.alert(
          'Success',
          'Recipe updated successfully! The food item has also been updated.',
          [
            {
              text: 'View Foods',
              onPress: () => navigation.navigate('FoodList')
            },
            { text: 'OK', style: 'default' }
          ]
        );
      }
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError('Error saving recipe: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToFood = async () => {
    if (!recipe) return;

    try {
      setSaving(true);
      setError(null);
      const { foodItemId } = await recipeService.convertToFoodItem(recipe.id);
      Alert.alert(
        'Success',
        'Recipe converted to food item successfully',
        [
          {
            text: 'View Food',
            onPress: () => navigation.navigate('FoodDetail', { foodId: foodItemId })
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (err) {
      setError('Failed to convert recipe to food item');
      console.error('Error converting recipe:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = () => {
    navigation.navigate('SearchFoodForRecipe', {
      recipeId: route.params.recipeId
    });
  };

  useEffect(() => {
    const selectedFood = route.params?.selectedIngredient;
    if (selectedFood) {
      setSelectedIngredient(selectedFood);
      setShowEditIngredientModal(true);
      navigation.setParams({ selectedIngredient: undefined });
    }
  }, [route.params?.selectedIngredient]);

  const handleSaveIngredient = (amount: number, savedFood: Food) => {
    if (!selectedIngredient) return;

    // Ensure we have a numeric ID
    const foodItemId = Number(savedFood.id);
    if (isNaN(foodItemId)) {
      console.error('Invalid food ID:', savedFood.id);
      return;
    }

    const newIngredient: DraggableIngredient = {
      id: Date.now(), // Use timestamp as temporary ID
      recipe_id: Number(recipeId),
      food_item_id: foodItemId,
      amount,
      unit: savedFood.serving_unit,
      order_index: ingredients.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_id: '',
      is_deleted: false,
      // Joined fields
      food_name: savedFood.name,
      calories_per_serving: savedFood.calories,
      protein_grams: savedFood.protein,
      carbs_grams: savedFood.carbs,
      fat_grams: savedFood.fat
    };

    setIngredients(prev => [...prev, newIngredient]);
    setForm(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, {
        food_item_id: foodItemId,
        amount: newIngredient.amount,
        unit: newIngredient.unit,
        order_index: newIngredient.order_index
      }]
    }));

    setSelectedIngredient(null);
    setShowEditIngredientModal(false);
  };

  const calculateNutritionTotals = () => {
    return ingredients.reduce((totals, ing) => ({
      calories: totals.calories + (ing.calories_per_serving || 0) * (ing.amount || 1),
      protein: totals.protein + (ing.protein_grams || 0) * (ing.amount || 1),
      carbs: totals.carbs + (ing.carbs_grams || 0) * (ing.amount || 1),
      fat: totals.fat + (ing.fat_grams || 0) * (ing.amount || 1)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const nutritionTotals = calculateNutritionTotals();

  const handleRemoveIngredient = (index: number) => {
    const ingredientToRemove = form.ingredients[index];
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
    setIngredients(prev =>
      prev.filter(ing => ing.food_item_id !== ingredientToRemove.food_item_id)
    );
  };

  const handleUpdateIngredient = (index: number, amount: number, unit: string) => {
    const ingredient = form.ingredients[index];
    setForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, amount, unit } : ing
      )
    }));
    setIngredients(prev =>
      prev.map(ing =>
        ing.food_item_id === ingredient.food_item_id
          ? { ...ing, amount, unit }
          : ing
      )
    );
  };

  const handleAddStep = () => {
    setForm(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          description: '',
          order: prev.steps.length
        }
      ]
    }));
  };

  const handleUpdateStep = (index: number, description: string) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) =>
        i === index ? { ...step, description } : step
      )
    }));
  };

  const handleRemoveStep = (index: number) => {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const renderNutritionSummary = () => {
    const totals = ingredients.reduce((acc, ingredient) => ({
      calories: acc.calories + (ingredient.calories_per_serving || 0) * (ingredient.amount || 1),
      protein: acc.protein + (ingredient.protein_grams || 0) * (ingredient.amount || 1),
      carbs: acc.carbs + (ingredient.carbs_grams || 0) * (ingredient.amount || 1),
      fat: acc.fat + (ingredient.fat_grams || 0) * (ingredient.amount || 1)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const perServing = {
      calories: Math.round(totals.calories / form.servings),
      protein: Math.round(totals.protein * 10 / form.servings) / 10,
      carbs: Math.round(totals.carbs * 10 / form.servings) / 10,
      fat: Math.round(totals.fat * 10 / form.servings) / 10
    };

    return (
      <Card style={styles.nutritionCard}>
        <Card.Content>
          <Title>Nutrition Summary</Title>
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionColumn}>
              <Title>Total Recipe</Title>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(totals.calories)}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(totals.protein)}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(totals.carbs)}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{Math.round(totals.fat)}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
            <View style={styles.nutritionColumn}>
              <Title>Per Serving</Title>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{perServing.calories}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{perServing.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{perServing.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{perServing.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderIngredient = ({ item, drag, isActive }: RenderItemParams<DraggableIngredient>) => {
    const nutrition = {
      calories: Math.round((item.calories_per_serving || 0) * (item.amount || 1)),
      protein: Math.round((item.protein_grams || 0) * (item.amount || 1) * 10) / 10,
      carbs: Math.round((item.carbs_grams || 0) * (item.amount || 1) * 10) / 10,
      fat: Math.round((item.fat_grams || 0) * (item.amount || 1) * 10) / 10
    };

    return (
      <Card style={styles.draggableItem}>
        <View style={[styles.ingredientRow, isActive && { backgroundColor: theme.colors.surfaceVariant }]}>
          <IconButton
            icon="drag"
            size={20}
            onPress={drag}
          />
          <View style={styles.ingredientContent}>
            <Text style={[styles.ingredientName, { color: theme.colors.onSurface }]}>
              {item.food_name}
            </Text>
            <Text style={[styles.ingredientAmount, { color: theme.colors.onSurfaceVariant }]}>
              {item.amount} {item.unit}
            </Text>
            <View style={styles.macroRow}>
              <Text style={styles.macroText}>{nutrition.calories} cal</Text>
              <Text style={styles.macroText}>{nutrition.protein}g P</Text>
              <Text style={styles.macroText}>{nutrition.carbs}g C</Text>
              <Text style={styles.macroText}>{nutrition.fat}g F</Text>
            </View>
          </View>
          <IconButton
            icon="delete"
            size={20}
            onPress={() => handleRemoveIngredient(ingredients.findIndex(i => i.food_item_id === item.food_item_id))}
            style={{
              marginLeft: 4
            }}
            color={theme.colors.error}
          />
        </View>
      </Card>
    );
  };

  const renderStep = ({ item, drag, isActive }: RenderItemParams<DraggableStep>) => (
    <Card style={styles.draggableItem}>
      <View style={[styles.stepRow, isActive && { backgroundColor: theme.colors.surfaceVariant }]}>
        <IconButton
          icon="drag"
          size={20}
          onPress={drag}
          style={styles.dragHandle}
        />
        <TextInput
          value={item.description}
          onChangeText={(text) => {
            setForm(prev => ({
              ...prev,
              steps: prev.steps.map(s =>
                s.order === item.order ? { ...s, description: text } : s
              )
            }));
          }}
          style={[
            styles.stepInput,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              color: theme.colors.onSurface,
              minHeight: 44,
              flex: 1
            }
          ]}
          multiline
          placeholder="Enter step description..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          textAlignVertical="center"
        />
        <IconButton
          icon="delete"
          size={20}
          onPress={() => {
            setForm(prev => ({
              ...prev,
              steps: prev.steps.filter(s => s.order !== item.order)
            }));
          }}
          style={{
            marginLeft: 4
          }}
          color={theme.colors.error}
        />
      </View>
    </Card>
  );

  const renderAddIcon = (onPress: () => void): ReactNode => (
    <IconButton icon="add" color="white" onPress={onPress} />
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={isNew ? undefined : loadRecipe} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                color: theme.colors.onSurface
              }
            ]}
            value={form.name}
            onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            placeholder="Recipe Name"
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                color: theme.colors.onSurface,
                height: 100,
                textAlignVertical: 'top'
              }
            ]}
            value={form.description}
            onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
            placeholder="Description"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                color: theme.colors.onSurface
              }
            ]}
            value={form.servings.toString()}
            onChangeText={(text) => {
              const num = parseInt(text);
              if (!isNaN(num) && num > 0) {
                setForm(prev => ({ ...prev, servings: num }));
              }
            }}
            placeholder="Servings"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            keyboardType="numeric"
          />

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Nutrition
          </Text>
          {renderNutritionSummary()}

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Ingredients
          </Text>
          <DraggableFlatList
            data={ingredients}
            renderItem={renderIngredient}
            keyExtractor={(item) => item.food_item_id.toString()}
            onDragEnd={({ data }) => {
              setIngredients(data);
              setForm(prev => ({
                ...prev,
                ingredients: data.map((item, index) => ({
                  food_item_id: item.food_item_id,
                  amount: item.amount,
                  unit: item.unit,
                  order_index: index
                }))
              }));
            }}
          />
          <Button
            mode="contained"
            onPress={handleAddIngredient}
            icon="plus"
            style={styles.addButton}
          >
            Add Ingredient
          </Button>

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Steps
          </Text>
          <DraggableFlatList
            data={form.steps}
            renderItem={renderStep}
            keyExtractor={(item, index) => `step-${index}`}
            onDragEnd={({ data }) => {
              setForm(prev => ({
                ...prev,
                steps: data.map((item, index) => ({ ...item, order: index }))
              }));
            }}
          />
          <Button
            mode="contained"
            onPress={handleAddStep}
            icon="plus"
            style={styles.addButton}
          >
            Add Step
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <FAB
          icon="content-save"
          label={saving ? 'Saving...' : 'Save Recipe'}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          color="white"
        />
      </Portal>

      <EditIngredientModal
        visible={showEditIngredientModal}
        onDismiss={() => {
          setShowEditIngredientModal(false);
          setSelectedIngredient(null);
        }}
        onSave={handleSaveIngredient}
        food={selectedIngredient as Food}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 16,
    fontSize: 20,
    fontWeight: 'bold',
  },
  draggableItem: {
    marginBottom: 8,
    elevation: 1,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
  },
  ingredientContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  ingredientName: {
    fontSize: 16,
    marginBottom: 2,
  },
  ingredientAmount: {
    fontSize: 14,
    color: '#666',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 4,
    gap: 8,
  },
  stepInput: {
    flex: 1,
    fontSize: 16,
  },
  dragHandle: {
    marginRight: 4,
  },
  deleteButton: {
    marginLeft: 4,
  },
  addButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  nutritionCard: {
    marginBottom: 16,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nutritionColumn: {
    flex: 1,
    alignItems: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  macroText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
});