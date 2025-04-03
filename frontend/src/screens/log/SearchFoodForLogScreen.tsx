import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import {
  Searchbar,
  Text,
  Card,
  Title,
  Divider,
  ActivityIndicator,
  Avatar,
  useTheme,
  Chip,
  Switch
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LogStackParamList, RootStackScreenProps } from '../../types/navigation';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';
import { MD3Theme } from 'react-native-paper/lib/typescript/types';

import { foodService, FoodItem } from '../../services/foodService';
import { Food } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';
import { foodLogService } from '../../services/foodLogService';
import { getSourceIcon, getSourceColor } from '../../utils/foodUtils';

const mapFoodItemToFood = (item: FoodItem): Food => {
  // Ensure id is a number
  const id = typeof item.id === 'string' ? parseInt(item.id, 10) : (item.id || 0);

  // Ensure source is one of the valid types
  const validSources = ['custom', 'usda', 'recipe'] as const;
  const source = validSources.includes(item.source as any) ? item.source as 'custom' | 'usda' | 'recipe' : 'custom';

  return {
    id,
    name: item.name,
    barcode: item.barcode,
    brand: item.brand,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    serving_size: item.serving_size,
    serving_unit: item.serving_unit,
    is_custom: item.source === 'custom',
    source,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  };
};

// Add a function to get user-friendly source names
const getSourceName = (source: string): string => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'USDA';
    case 'nutritionix':
      return 'Nutritionix';
    case 'openfoodfacts':
      return 'Open Food Facts';
    case 'custom':
      return 'My Foods';
    case 'recipe':
      return 'Recipe';
    default:
      return source || 'Unknown';
  }
};

type Props = RootStackScreenProps<'LogStack'>;

const SearchFoodForLogScreen: React.FC<Props> = ({ route }) => {
  const theme = useTheme();
  const navigation = useNavigation<Props['navigation']>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  // Always show all users' foods by default
  const [showAllUsersFoods, setShowAllUsersFoods] = useState(true);

  const { mealType, date } = route.params;

  // Helper function to capitalize food name
  const capitalizeFoodName = (name: string): string => {
    return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  // Fetch foods function
  const fetchFoods = useCallback(async (query: string = '', forceRefresh: boolean = false) => {
    try {
      setIsLoading(!forceRefresh);
      if (forceRefresh) setIsRefreshing(true);

      let results;
      if (query.trim()) {
        results = await foodService.searchFood(query);
      } else {
        // Get both custom foods and food logs
        const [customFoods, recentLogs] = await Promise.all([
          foodService.getCustomFoods(showAllUsersFoods),
          foodLogService.getLogs(new Date().toISOString().split('T')[0])
        ]);

        // Create a map of food IDs to their last used date
        const foodLastUsed = new Map();
        recentLogs.forEach(log => {
          const currentDate = new Date(log.created_at || '').getTime();
          const existingDate = foodLastUsed.get(log.food_item_id);
          if (!existingDate || currentDate > existingDate) {
            foodLastUsed.set(log.food_item_id, currentDate);
          }
        });

        // Sort custom foods by last used date
        const sortedCustomFoods = customFoods.sort((a, b) => {
          const aLastUsed = foodLastUsed.get(a.id) || new Date(a.updated_at || a.created_at || '').getTime();
          const bLastUsed = foodLastUsed.get(b.id) || new Date(b.updated_at || b.created_at || '').getTime();
          return bLastUsed - aLastUsed;
        });

        results = {
          foods: sortedCustomFoods.map(item => ({
            ...mapFoodItemToFood(item),
            name: capitalizeFoodName(item.name)
          })),
          total: sortedCustomFoods.length,
          page: 1,
          limit: 20
        };
      }

      const mappedFoods = (results.foods || []).map(food => ({
        ...food,
        name: capitalizeFoodName(food.name)
      }));

      setFoods(mappedFoods);
      setFilteredFoods(mappedFoods);
    } catch (error) {
      console.error('Error fetching foods:', error);
      Alert.alert(
        'Error',
        'Failed to load foods. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showAllUsersFoods]);

  // Effect for initial load and when the showAllUsersFoods toggle changes
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods, showAllUsersFoods]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('SearchFoodForLog screen focused, refreshing food list');
      fetchFoods(searchQuery);
    }, [fetchFoods, searchQuery])
  );

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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    fetchFoods(searchQuery, true);
  }, [fetchFoods, searchQuery]);

  // Handle adding food to log
  const handleAddToLog = (food: Food) => {
    navigation.navigate('AddFoodToLogModal', {
      food,
      mealType,
      date
    });
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    const sourceColor = getSourceColor(item.source || '', theme);

    return (
      <TouchableOpacity onPress={() => handleAddToLog(item)}>
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
                <Text style={styles.foodName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.servingInfo}>
                  {item.serving_size || 100}{item.serving_unit || 'g'}
                </Text>
                <TouchableOpacity onPress={() => handleAddToLog(item)}>
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
                {getSourceName(item.source || '')}
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
    searchBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    searchBar: {
      flex: 1,
      marginRight: 8,
      elevation: 0,
      backgroundColor: theme.colors.background,
    },
    scanButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      elevation: 2,
      justifyContent: 'center',
      alignItems: 'center',
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
      marginTop: 10,
      color: theme.colors.onSurface,
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
    foodInfoContainer: {
      marginLeft: 72, // Increased to accommodate larger icon
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
    actionIcon: {
      backgroundColor: 'transparent',
    },
    nutritionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 16,
      flexWrap: 'wrap',
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
    sourceChip: {
      marginBottom: 8,
    },
  });

  useEffect(() => {
    // Log navigation state for debugging
    const navigationState = navigation.getState();
    const routes = navigationState.routes;
    const currentRoute = routes[routes.length - 1];

    console.log("SearchFoodForLogScreen - Navigation State:",
      JSON.stringify({
        currentScreen: currentRoute.name,
        params: route.params,
        routesCount: routes.length,
        parentNavigator: navigation.getParent()?.getId() || 'none'
      }, null, 2)
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBarWrapper}>
          <Searchbar
            placeholder="Search foods..."
            onChangeText={handleSearchQueryChange}
            value={searchQuery}
            style={styles.searchBar}
            icon="magnify"
            clearIcon="close"
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('BarcodeScanner', {
              mealType,
              date,
              fromLog: true
            })}
          >
            <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading foods...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {filteredFoods.map((item, index) => (
            <View key={item.id || index}>
              {renderFoodItem({ item })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default SearchFoodForLogScreen;