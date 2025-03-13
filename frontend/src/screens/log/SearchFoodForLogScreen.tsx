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
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

import { foodService, FoodItem } from '../../services/foodService';
import { Food } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';
import { LogStackParamList } from '../../navigation/LogStackNavigator';
import { foodLogService } from '../../services/foodLogService';

const mapFoodItemToFood = (item: FoodItem): Food => ({
  id: item.id.toString(),
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
  source: item.source,
  created_at: item.created_at || new Date().toISOString(),
  updated_at: item.updated_at || new Date().toISOString()
});

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

const SearchFoodForLogScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<LogStackParamList>>();
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);

  // Get mealType and date from route params
  const { mealType, date } = route.params as { mealType: string; date: string };

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
          foodService.getCustomFoods(),
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
  }, []);

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
          <Card.Content style={styles.foodCardContent}>
            <Avatar.Icon
              size={40}
              icon={getSourceIcon(item.source || '')}
              style={{ backgroundColor: sourceColor }}
              color="#fff"
            />
            <View style={styles.foodInfo}>
              <Title style={[styles.foodName, { color: sourceColor }]}>{item.name}</Title>
              {item.brand && <Text style={styles.brandText}>{item.brand}</Text>}

              <View style={styles.macroContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{item.calories}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{item.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{item.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{item.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleAddToLog(item)}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  foodCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  foodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  foodInfo: {
    flex: 1,
    marginLeft: 16,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  brandText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  macroLabel: {
    fontSize: 14,
    color: '#757575',
  },
  actionButton: {
    margin: 0,
    padding: 0,
  },
});

export default SearchFoodForLogScreen;