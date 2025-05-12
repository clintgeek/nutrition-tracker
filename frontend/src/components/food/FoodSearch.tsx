import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import {
  Searchbar,
  Text,
  Card,
  ActivityIndicator,
  Avatar,
  useTheme,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

import { foodService, SearchResponse } from '../../services/foodService';
import { Food, FoodSource } from '../../types/Food';
import { getSourceIcon, getSourceColor } from '../../utils/foodUtils';

interface FoodSearchProps {
  onSelectFood: (food: Food) => void;
  initialQuery?: string;
  showBarcodeScanner?: boolean;
  onBarcodePress?: () => void;
  emptyStateMessage?: string;
  emptyStateIcon?: string;
  showRecentFoods?: boolean;
  showCustomFoods?: boolean;
  showRecipeFoods?: boolean;
  showExternalFoods?: boolean;
  onRefresh?: () => void;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({
  onSelectFood,
  initialQuery = '',
  showBarcodeScanner = true,
  onBarcodePress,
  emptyStateMessage = 'No foods found',
  emptyStateIcon = 'food-off',
  showRecentFoods = true,
  showCustomFoods = true,
  showRecipeFoods = true,
  showExternalFoods = true,
  onRefresh,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch foods function
  const fetchFoods = useCallback(async (query: string = '', forceRefresh: boolean = false) => {
    try {
      setIsLoading(!forceRefresh);
      if (forceRefresh) setIsRefreshing(true);
      setError(null);
      let results: SearchResponse;
      let recentFoods: Food[] = [];
      let customFoods: Food[] = [];
      let recipeFoods: Food[] = [];
      let allFoods: Food[] = [];

      if (showRecentFoods && !query.trim()) {
        recentFoods = await foodService.getRecentFoods();
        customFoods = showCustomFoods ? await foodService.getCustomFoods() : [];
        recipeFoods = showRecipeFoods ? await foodService.getRecipeFoods() : [];
        allFoods = [...recentFoods, ...customFoods, ...recipeFoods];
        results = {
          foods: allFoods,
          total: allFoods.length,
          page: 1,
          limit: 20
        };
      } else if (!query.trim()) {
        customFoods = showCustomFoods ? await foodService.getCustomFoods() : [];
        recipeFoods = showRecipeFoods ? await foodService.getRecipeFoods() : [];
        allFoods = [...customFoods, ...recipeFoods];
        results = {
          foods: allFoods,
          total: allFoods.length,
          page: 1,
          limit: 20
        };
      } else {
        results = await foodService.searchFood(query, 1, 20);
        recentFoods = showRecentFoods ? await foodService.getRecentFoods() : [];
        customFoods = showCustomFoods ? await foodService.getCustomFoods() : [];
        recipeFoods = showRecipeFoods ? await foodService.getRecipeFoods() : [];
        // Sort: custom and recent foods to top
        const isRecent = (food: Food) => recentFoods.some(rf => rf.id === food.id);
        results.foods.sort((a, b) => {
          const aIsCustom = a.source === 'custom';
          const bIsCustom = b.source === 'custom';
          const aIsRecent = isRecent(a);
          const bIsRecent = isRecent(b);
          if (aIsRecent && !bIsRecent) return -1;
          if (!aIsRecent && bIsRecent) return 1;
          if (aIsCustom && !bIsCustom) return -1;
          if (!aIsCustom && bIsCustom) return 1;
          return 0;
        });
        // Merge in custom/recent foods that match the query but are missing from results
        const queryLower = query.toLowerCase();
        const matchesQuery = (food: Food) =>
          food.name.toLowerCase().includes(queryLower) || (food.brand && food.brand.toLowerCase().includes(queryLower));
        const searchIds = new Set(results.foods.map(f => f.id));
        const extraRecent = recentFoods.filter(f => matchesQuery(f) && !searchIds.has(f.id));
        const extraCustom = customFoods.filter(f => matchesQuery(f) && !searchIds.has(f.id));
        results.foods = [...extraRecent, ...extraCustom, ...results.foods];
      }

      const mappedFoods = results.foods.map((food: Food) => ({
        ...food,
        name: food.name.charAt(0).toUpperCase() + food.name.slice(1)
      }));

      setFoods(mappedFoods);
    } catch (error) {
      console.error('Error fetching foods:', error);
      setError('Failed to fetch foods. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showRecentFoods, showRecipeFoods, showCustomFoods]);

  // Create a memoized debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      if (query.length >= 2) {
        fetchFoods(query);
      } else if (query.length === 0) {
        fetchFoods('');
      }
    }, 500), // Reduced debounce time for better responsiveness
    [fetchFoods]
  );

  // Handle search query change
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchFoods(searchQuery, true);
    onRefresh?.();
  }, [fetchFoods, searchQuery, onRefresh]);

  // Initial load
  React.useEffect(() => {
    fetchFoods(initialQuery);
  }, [fetchFoods, initialQuery]);

  const renderFoodItem = ({ item }: { item: Food }) => {
    const sourceColor = getSourceColor(item.source || '', theme);

    return (
      <TouchableOpacity onPress={() => onSelectFood(item)}>
        <Card style={styles.foodCard}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Icon
              size={48}
              icon={getSourceIcon(item.source || '')}
              style={[styles.sourceIcon, { backgroundColor: `${sourceColor}20` }]}
              color={sourceColor}
            />

            <View style={styles.foodInfoContainer}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.brand && (
                    <Text style={styles.foodBrand} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  )}
                </View>
                <Text style={styles.servingInfo}>
                  {item.serving_size || 100}{item.serving_unit || 'g'}
                </Text>
                <TouchableOpacity onPress={() => onSelectFood(item)}>
                  <Avatar.Icon
                    size={24}
                    icon="plus"
                    color={theme.colors.primary}
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
              </View>

              <Chip
                style={[styles.sourceChip, { backgroundColor: `${sourceColor}15` }]}
                textStyle={{ color: sourceColor, fontSize: 12 }}
                compact
              >
                {item.source}
              </Chip>

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{Math.round(item.calories || 0)}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.protein || 0)).toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.carbs || 0)).toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{(Number(item.fat || 0)).toFixed(1)}g</Text>
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
        <View style={styles.searchBarWrapper}>
          <Searchbar
            placeholder="Search foods..."
            onChangeText={handleSearchQueryChange}
            value={searchQuery}
            style={styles.searchBar}
          />
          {showBarcodeScanner && onBarcodePress && (
            <TouchableOpacity onPress={onBarcodePress} style={styles.scanButton}>
              <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading foods...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={[styles.emptyText, { color: theme.colors.error }]}>{error}</Text>
        </View>
      ) : foods.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name={emptyStateIcon} size={48} color="#666" />
          <Text style={styles.emptyText}>{emptyStateMessage}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {foods.map((food, index) => (
            <React.Fragment key={`${food.id}-${index}`}>
              {renderFoodItem({ item: food })}
            </React.Fragment>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  scanButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  foodCard: {
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: 'white',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  sourceIcon: {
    marginRight: 12,
  },
  foodInfoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  foodName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  servingInfo: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  actionIcon: {
    backgroundColor: 'transparent',
  },
  sourceChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  foodBrand: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 2,
  },
});