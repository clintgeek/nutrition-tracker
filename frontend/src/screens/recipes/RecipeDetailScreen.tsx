import React, { useEffect, useState, ReactNode } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import type { RouteProp } from '@react-navigation/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, Portal, FAB } from 'react-native-paper';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Recipe, RecipeIngredient, RecipeStep, CreateRecipeDTO, CreateRecipeStepDTO } from '../../types/Recipe';
import { RecipeStackParamList } from '../../types/navigation';
import { recipeService } from '../../services/recipeService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { IconButton } from '../../components/IconButton';
import { formatNumber } from '../../utils/formatters';
import { Icon } from '@rneui/themed';

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
    console.log('handleAddIngredient called - navigating to SearchFoodForRecipe');
    console.log('Current recipeId:', recipeId);

    // Try a different navigation approach
    const params = {
      recipeId: typeof recipeId === 'string' ? 'new' : Number(recipeId)
    };
    console.log('Navigation params:', params);

    // Try using the push method instead of navigate
    navigation.push('SearchFoodForRecipe', params);
    console.log('Navigation push completed');
  };

  // Handle selected ingredient from search
  useEffect(() => {
    const selectedIngredient = route.params?.selectedIngredient;
    console.log('Selected ingredient changed:', JSON.stringify(selectedIngredient, null, 2));
    console.log('Current ingredients:', JSON.stringify(ingredients, null, 2));
    console.log('Current form ingredients:', JSON.stringify(form.ingredients, null, 2));

    if (selectedIngredient) {
      const foodItemId = parseInt(selectedIngredient.id.toString());
      console.log('Adding ingredient with ID:', foodItemId);

      // Update form ingredients
      setForm(prev => {
        // Check if ingredient already exists
        const exists = prev.ingredients.some(ing => ing.food_item_id === foodItemId);
        if (exists) {
          console.log('Ingredient already exists in form, not adding again');
          return prev;
        }

        console.log('Previous form ingredients:', JSON.stringify(prev.ingredients, null, 2));

        const newIngredient = {
          food_item_id: foodItemId,
          amount: 1,
          unit: selectedIngredient.serving_unit || 'serving',
          order_index: prev.ingredients.length
        };

        console.log('New ingredient to add:', JSON.stringify(newIngredient, null, 2));

        const newIngredients = [...prev.ingredients, newIngredient];
        console.log('Combined ingredients:', JSON.stringify(newIngredients, null, 2));

        const newForm = {
          ...prev,
          ingredients: newIngredients
        };

        console.log('Updated form ingredients:', JSON.stringify(newForm.ingredients, null, 2));
        return newForm;
      });

      // Also update ingredients state with food details
      setIngredients(prev => {
        // Check if ingredient already exists
        const exists = prev.some(ing => ing.food_item_id === foodItemId);
        if (exists) {
          console.log('Ingredient already exists in ingredients, not adding again');
          return prev;
        }

        console.log('Previous ingredients:', JSON.stringify(prev, null, 2));

        const newIngredient = {
          id: Date.now(), // Temporary ID for new ingredient
          recipe_id: typeof recipeId === 'string' ? -1 : Number(recipeId),
          food_item_id: foodItemId,
          food_name: selectedIngredient.name,
          calories_per_serving: selectedIngredient.calories,
          protein_grams: selectedIngredient.protein,
          carbs_grams: selectedIngredient.carbs,
          fat_grams: selectedIngredient.fat,
          amount: 1,
          unit: selectedIngredient.serving_unit || 'serving',
          order_index: prev.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          sync_id: null,
          is_deleted: false
        };

        console.log('New ingredient to add:', JSON.stringify(newIngredient, null, 2));

        const newIngredients = [...prev, newIngredient];
        console.log('Combined ingredients:', JSON.stringify(newIngredients, null, 2));

        return newIngredients;
      });

      // Clear the selected ingredient from params
      navigation.setParams({ selectedIngredient: undefined });
      console.log('Cleared selected ingredient from params');
    }
  }, [route.params?.selectedIngredient, recipeId]);

  // Update the nutrition calculations to account for ingredient amounts
  const calculateNutritionTotals = () => {
    return ingredients.reduce((totals, ing) => ({
      calories: totals.calories + (ing.calories_per_serving || 0) * (ing.amount || 1),
      protein: totals.protein + (ing.protein_grams || 0) * (ing.amount || 1),
      carbs: totals.carbs + (ing.carbs_grams || 0) * (ing.amount || 1),
      fat: totals.fat + (ing.fat_grams || 0) * (ing.amount || 1)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Update the nutrition display section
  const nutritionTotals = calculateNutritionTotals();

  // Also update handleRemoveIngredient to remove from both states
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

  // Update handleUpdateIngredient to update both states
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

  const renderIngredient = ({ item, drag, isActive }: RenderItemParams<DraggableIngredient>) => (
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
        </View>
        <IconButton
          icon="delete"
          size={20}
          onPress={() => {
            setForm(prev => ({
              ...prev,
              ingredients: prev.ingredients.filter(i => i.food_item_id !== item.food_item_id)
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
        />
      </Portal>
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
});