import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import {
  Searchbar,
  Text,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Avatar,
  Chip,
  useTheme,
  Button,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import debounce from 'lodash/debounce';

import { foodService, FoodItem } from '../../services/foodService';
import { Food } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';
import { formatBarcodeForDisplay } from '../../utils/validation';

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

const AddFoodToLogScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);

  // Fetch foods function
  const fetchFoods = useCallback(async (query: string = '', forceRefresh: boolean = false) => {
    try {
      console.log('Fetching foods with query:', query, 'forceRefresh:', forceRefresh);
      setIsLoading(!forceRefresh);
      if (forceRefresh) setIsRefreshing(true);

      let results;
      if (query.trim()) {
        // If there's a search query, use the search endpoint
        console.log('Using search endpoint for query:', query);
        results = await foodService.searchFood(query);
      } else {
        // If no search query, get custom foods
        console.log('Fetching custom foods (no query)');
        const customFoods = await foodService.getCustomFoods();
        console.log('Received custom foods:', customFoods);
        results = {
          foods: customFoods.map(item => {
            const mapped = mapFoodItemToFood(item);
            console.log('Mapped food item:', { original: item, mapped });
            return mapped;
          }),
          total: customFoods.length,
          page: 1,
          limit: 20
        };
      }

      console.log('Setting foods state with:', results.foods);
      setFoods(results.foods || []);
      setFilteredFoods(results.foods || []);
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

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      fetchFoods(query);
    }, 500),
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
    navigation.navigate('AddFoodToLogModal', { food });
  };

  // Render food item
  const renderFoodItem = ({ item }: { item: Food }) => (
    <Card style={styles.card} onPress={() => handleAddToLog(item)}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Title style={styles.title}>{item.name}</Title>
            {item.brand && (
              <Paragraph style={styles.brand}>{item.brand}</Paragraph>
            )}
          </View>
          <Avatar.Icon
            size={40}
            icon={getSourceIcon(item.source)}
            color={getSourceColor(item.source, theme)}
            style={{ backgroundColor: theme.colors.surface }}
          />
        </View>

        <View style={styles.nutritionContainer}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>{Math.round(item.calories)}</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>{Math.round(item.protein)}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>{Math.round(item.carbs)}g</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>{Math.round(item.fat)}g</Text>
          </View>
        </View>

        <View style={styles.servingInfo}>
          <Text style={styles.servingText}>
            Serving: {item.serving_size} {item.serving_unit}
          </Text>
          {item.barcode && (
            <Text style={styles.barcodeText}>
              Barcode: {formatBarcodeForDisplay(item.barcode)}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search foods..."
        onChangeText={handleSearchQueryChange}
        value={searchQuery}
        style={styles.searchBar}
        iconColor={theme.colors.primary}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="food"
              title="No foods found"
              message={searchQuery ? "Try adjusting your search" : "Add a custom food to get started"}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 16,
    elevation: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: '#666',
  },
  nutritionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  servingInfo: {
    marginTop: 8,
  },
  servingText: {
    fontSize: 14,
    color: '#666',
  },
  barcodeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default AddFoodToLogScreen;