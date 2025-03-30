import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import {
  Searchbar,
  Text,
  Card,
  Title,
  ActivityIndicator,
  Avatar,
  useTheme,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/core';
import type { RouteProp } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

import { foodService, FoodItem } from '../../services/foodService';
import { Food } from '../../types';
import { RecipeStackParamList } from '../../types/navigation';
import EmptyState from '../../components/common/EmptyState';

type SearchFoodForRecipeScreenNavigationProp = NativeStackNavigationProp<RecipeStackParamList>;
type SearchFoodForRecipeScreenRouteProp = RouteProp<RecipeStackParamList, 'SearchFoodForRecipe'>;

const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'leaf';
    case 'openfoodfacts':
      return 'database';
    case 'custom':
      return 'food-apple';
    default:
      return 'food';
  }
};

const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';
    case 'openfoodfacts':
      return '#2196F3';
    case 'custom':
      return '#FF9800';
    default:
      return theme.colors.primary;
  }
};

const mapFoodItemToFood = (item: FoodItem): Food => ({
  id: typeof item.id === 'string' ? parseInt(item.id, 10) : (item.id || -(Math.floor(Math.random() * 1000000) + 1)),
  name: item.name,
  barcode: item.barcode || undefined,
  brand: item.brand || undefined,
  calories: item.calories || 0,
  protein: item.protein || 0,
  carbs: item.carbs || 0,
  fat: item.fat || 0,
  serving_size: item.serving_size || 100,
  serving_unit: item.serving_unit || 'g',
  is_custom: item.source === 'custom',
  source: item.source === 'custom' ? 'custom' : 'usda',
  created_at: item.created_at || new Date().toISOString(),
  updated_at: item.updated_at || new Date().toISOString()
});

export function SearchFoodForRecipeScreen() {
  const theme = useTheme();
  const navigation = useNavigation<SearchFoodForRecipeScreenNavigationProp>();
  const route = useRoute<SearchFoodForRecipeScreenRouteProp>();

  console.log('SearchFoodForRecipeScreen mounted');
  console.log('Route params:', route.params);

  // Add a focus listener to detect when the screen becomes active
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('SearchFoodForRecipeScreen focused');
      console.log('Route params on focus:', route.params);
    });

    return unsubscribe;
  }, [navigation, route]);

  const { recipeId } = route.params as RecipeStackParamList['SearchFoodForRecipe'];
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);

  // Helper function to capitalize food name
  const capitalizeFoodName = (name: string): string => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  // Fetch foods function
  const fetchFoods = useCallback(async (query: string = '') => {
    try {
      setIsLoading(true);

      let results;
      if (query.trim()) {
        results = await foodService.searchFood(query);
      } else {
        // Get custom foods first
        const customFoods = await foodService.getCustomFoods();

        // Try to get recipe foods, but handle failure gracefully
        let recipeFoods: Food[] = [];
        try {
          recipeFoods = await foodService.getRecipeFoods();
        } catch (error) {
          console.warn('Failed to fetch recipe foods:', error);
          // Continue without recipe foods
        }

        // Combine and sort all foods alphabetically
        const allFoods = [...customFoods, ...recipeFoods].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        results = {
          foods: allFoods,
          total: allFoods.length,
          page: 1,
          limit: 20
        };
      }

      // Map foods using the helper function and ensure all fields have defaults
      const mappedFoods = (results.foods || []).map(food => ({
        ...mapFoodItemToFood(food),
        name: capitalizeFoodName(food.name),
        calories: food.calories || 0,
        protein: food.protein || 0,
        carbs: food.carbs || 0,
        fat: food.fat || 0,
        serving_size: food.serving_size || 100,
        serving_unit: food.serving_unit || 'g',
        is_custom: food.source === 'custom',
        source: food.source
      }));

      setFoods(mappedFoods);
    } catch (error) {
      console.error('Error fetching foods:', error);
      Alert.alert(
        'Error',
        'Failed to load foods. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a focus listener to refresh the list when the screen becomes active
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('SearchFoodForRecipeScreen focused - refreshing foods list');
      fetchFoods(searchQuery);
    });

    return unsubscribe;
  }, [navigation, fetchFoods, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  // Create a memoized debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      fetchFoods(query);
    }, 1000),
    [fetchFoods]
  );

  // Handle search query change
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Handle selecting a food item
  const handleSelectFood = async (food: Food) => {
    try {
      let finalFood = food;

      // If the food has a negative ID or is not custom, create a custom copy
      if (food.id < 0 || !food.is_custom) {
        const customFood = await foodService.createCustomFood({
          name: food.name,
          brand: food.brand,
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          serving_size: food.serving_size || 100,
          serving_unit: food.serving_unit || 'g',
          source: 'custom'
        });

        // Ensure all fields are properly set
        finalFood = {
          ...customFood,
          name: capitalizeFoodName(customFood.name),
          calories: customFood.calories || food.calories || 0,
          protein: customFood.protein || food.protein || 0,
          carbs: customFood.carbs || food.carbs || 0,
          fat: customFood.fat || food.fat || 0,
          serving_size: customFood.serving_size || food.serving_size || 100,
          serving_unit: customFood.serving_unit || food.serving_unit || 'g',
          is_custom: true,
          source: 'custom',
          created_at: customFood.created_at || new Date().toISOString(),
          updated_at: customFood.updated_at || new Date().toISOString()
        };
      }

      // Navigate back to recipe detail with the selected food and original recipeId
      navigation.navigate('RecipeDetail', {
        recipeId: typeof recipeId === 'string' ? 'new' : Number(recipeId),
        selectedIngredient: finalFood
      });
    } catch (error) {
      console.error('Error handling food selection:', error);
      Alert.alert(
        'Error',
        'Failed to add food to recipe. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 1,
    },
    searchBar: {
      elevation: 0,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingVertical: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      color: theme.colors.onSurfaceVariant,
    },
    foodCard: {
      marginHorizontal: 16,
      marginVertical: 4,
      elevation: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
    cardContent: {
      padding: 16,
    },
    sourceIcon: {
      position: 'absolute',
      top: '50%',
      left: 16,
      transform: [{ translateY: -24 }], // Half the size to center it
    },
    foodInfo: {
      marginLeft: 72, // 48dp (icon size) + 16dp (margin) + 8dp (extra space)
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    foodName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurface,
      marginRight: 4,
    },
    servingInfo: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      flex: 1,
    },
    nutritionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    nutritionItem: {
      alignItems: 'center',
    },
    nutritionValue: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    nutritionLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
    },
  });

  const renderFoodItem = ({ item }: { item: Food }) => {
    const sourceColor = getSourceColor(item.source || '', theme);

    return (
      <TouchableOpacity onPress={() => handleSelectFood(item)}>
        <Card style={styles.foodCard}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Icon
              size={48}
              icon={getSourceIcon(item.source || '')}
              style={[styles.sourceIcon, { backgroundColor: `${sourceColor}20` }]}
              color={sourceColor}
            />

            <View style={styles.foodInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.servingInfo}>
                  {item.serving_size}{item.serving_unit}
                </Text>
                <Avatar.Icon
                  size={24}
                  icon="plus"
                  color={theme.colors.primary}
                  style={{ backgroundColor: 'transparent' }}
                />
              </View>

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{Math.round(item.calories)}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.protein)).toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.carbs)).toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.fat)).toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search foods..."
          onChangeText={handleSearchQueryChange}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading foods...</Text>
        </View>
      ) : foods.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          {foods.map((food) => renderFoodItem({ item: food }))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="food-apple"
          title="No foods found"
          message={searchQuery ? "Try a different search term" : "Search for foods to add to your recipe"}
        />
      )}
    </View>
  );
}