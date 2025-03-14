import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { FAB, Text, Card, useTheme, Portal } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Recipe } from '../../types';
import { RecipeStackParamList } from '../../types/navigation';
import { recipeService } from '../../services/recipeService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorMessage } from '../../components/common/ErrorMessage';
import { formatNumber } from '../../utils/formatters';

export function RecipesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RecipeStackParamList>>();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recipeService.getRecipes();
      setRecipes(data);
    } catch (err) {
      setError('Failed to load recipes');
      console.error('Error loading recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecipePress = (recipeId: number) => {
    navigation.navigate('RecipeDetail', { recipeId });
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <Card
      style={styles.recipeCard}
      onPress={() => handleRecipePress(item.id)}
    >
      <Card.Content>
        <Text variant="titleLarge" style={styles.recipeName}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.servings}>
          {item.servings} serving{item.servings !== 1 ? 's' : ''}
        </Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text variant="labelSmall">Calories</Text>
            <Text variant="bodyLarge">
              {formatNumber(item.total_calories / item.servings)}
            </Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text variant="labelSmall">Protein</Text>
            <Text variant="bodyLarge">
              {formatNumber(item.total_protein_grams / item.servings)}g
            </Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text variant="labelSmall">Carbs</Text>
            <Text variant="bodyLarge">
              {formatNumber(item.total_carbs_grams / item.servings)}g
            </Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text variant="labelSmall">Fat</Text>
            <Text variant="bodyLarge">
              {formatNumber(item.total_fat_grams / item.servings)}g
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadRecipes} />;
  }

  return (
    <View style={styles.container}>
      {recipes.length > 0 ? (
        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={styles.emptyText}>
            No recipes yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Create your first recipe by tapping the + button
          </Text>
        </View>
      )}

      <Portal>
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('RecipeDetail', { recipeId: 'new' })}
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
  list: {
    padding: 16,
  },
  recipeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  recipeName: {
    marginBottom: 4,
  },
  servings: {
    marginBottom: 12,
    color: '#666',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  nutritionItem: {
    width: '25%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});