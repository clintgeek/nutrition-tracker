import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import {
  Searchbar,
  FAB,
  Text,
  Card,
  Title,
  Paragraph,
  Divider,
  ActivityIndicator,
  Avatar,
  Chip,
  useTheme,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import debounce from 'lodash/debounce';

import { foodService, FoodItem } from '../../services/foodService';
import { Food, CreateFoodDTO } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';
import EditableTextInput from '../../components/common/EditableTextInput';
import { formatBarcodeForDisplay } from '../../utils/validation';
import { FoodStackParamList } from '../../navigation/FoodStackNavigator';

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
      return 'leaf';  // Leaf icon for USDA
    case 'openfoodfacts':
      return 'database';  // Database icon for OpenFoodFacts
    case 'custom':
      return 'food-apple';  // Apple icon for custom foods (matching the tab icon)
    default:
      return 'food';
  }
};

const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';  // Green for USDA
    case 'openfoodfacts':
      return '#2196F3';  // Blue for OpenFoodFacts
    case 'custom':
      return '#FF9800';  // Orange for custom foods (matching the food database card)
    default:
      return theme.colors.primary;
  }
};

const FoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isFoodDetailsVisible, setIsFoodDetailsVisible] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

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
      // Show error to user
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
    console.log('Initial food load');
    fetchFoods();
  }, [fetchFoods]);

  // Create a memoized debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      console.log('Debounced search triggered with query:', query);
      fetchFoods(query);
    }, 1000),
    [fetchFoods]
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle search query changes
  useEffect(() => {
    console.log('Search query changed:', searchQuery);
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      console.log('Empty search query, loading custom foods');
      fetchFoods('');
    }
  }, [searchQuery, debouncedSearch, fetchFoods]);

  // Handle route params (scanned food and refresh)
  useFocusEffect(
    useCallback(() => {
      const params = route.params as { scannedFood?: Food; refresh?: boolean } | undefined;
      console.log('Route params changed:', params);

      if (params?.scannedFood) {
        console.log('Showing scanned food:', params.scannedFood);
        setSelectedFood(params.scannedFood);
        setIsFoodDetailsVisible(true);
        navigation.setParams({ scannedFood: undefined });
      }
      if (params?.refresh) {
        console.log('Refreshing food list due to route param');
        fetchFoods(searchQuery, true);
        navigation.setParams({ refresh: undefined });
      }
    }, [route.params, navigation, fetchFoods, searchQuery])
  );

  const handleSaveFood = async () => {
    if (!selectedFood) return;

    try {
      const foodData: CreateFoodDTO = {
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories || 0),
        protein: Math.round(selectedFood.protein || 0),
        carbs: Math.round(selectedFood.carbs || 0),
        fat: Math.round(selectedFood.fat || 0),
        serving_size: Math.round(Number(selectedFood.serving_size) || 100),
        serving_unit: selectedFood.serving_unit || 'g',
        barcode: selectedFood.barcode,
        brand: selectedFood.brand,
        source: 'custom',  // Always set source to custom for saved foods
        source_id: selectedFood.source_id,
      };

      if (selectedFood.id && selectedFood.source === 'custom') {
        // Update existing custom food
        console.log('Updating existing custom food:', selectedFood.id);
        await foodService.updateCustomFood(parseInt(selectedFood.id), foodData);
      } else {
        // Create new custom food
        console.log('Creating new custom food');
        await foodService.createCustomFood(foodData);
      }

      setIsFoodDetailsVisible(false);
      setSelectedFood(null);
      fetchFoods(searchQuery, true);
    } catch (error) {
      console.error('Error saving food:', error);
      alert('Failed to save food. Please try again.');
    }
  };

  const navigateToFoodDetails = (food: Food) => {
    setSelectedFood(food);
    setIsFoodDetailsVisible(true);
  };

  const navigateToAddFood = () => {
    navigation.navigate('AddFood');
  };

  const navigateToScanBarcode = () => {
    navigation.navigate('BarcodeScanner');
  };

  const handleDeleteFood = async (food: Food) => {
    setFoodToDelete(food);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!foodToDelete) return;

    try {
      await foodService.deleteFood(parseInt(foodToDelete.id, 10));
      await fetchFoods(searchQuery, true);
      setIsDeleteModalVisible(false);
      setFoodToDelete(null);
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Failed to delete food. Please try again.');
    }
  };

  const renderNutritionInfo = (food: Food) => (
    <View style={styles.nutritionInfo}>
      <Text>Calories: {food.calories}</Text>
      <Text>Protein: {food.protein}g</Text>
      <Text>Carbs: {food.carbs}g</Text>
      <Text>Fat: {food.fat}g</Text>
      <Text>Serving: {food.serving_size} {food.serving_unit}</Text>
    </View>
  );

  const renderFoodDetails = () => {
    if (!selectedFood) return null;

    return (
      <View style={styles.detailsContainer}>
        <EditableTextInput
          label="Name"
          value={selectedFood.name}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, name: text } : null)}
          style={styles.input}
        />
        <EditableTextInput
          label="Brand"
          value={selectedFood.brand || ''}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, brand: text } : null)}
          style={styles.input}
        />
        <EditableTextInput
          label="Calories"
          value={selectedFood.calories?.toString() || '0'}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, calories: parseFloat(text) || 0 } : null)}
          keyboardType="numeric"
          style={styles.input}
        />
        <EditableTextInput
          label="Protein (g)"
          value={selectedFood.protein?.toString() || '0'}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, protein: parseFloat(text) || 0 } : null)}
          keyboardType="numeric"
          style={styles.input}
        />
        <EditableTextInput
          label="Carbs (g)"
          value={selectedFood.carbs?.toString() || '0'}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, carbs: parseFloat(text) || 0 } : null)}
          keyboardType="numeric"
          style={styles.input}
        />
        <EditableTextInput
          label="Fat (g)"
          value={selectedFood.fat?.toString() || '0'}
          onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, fat: parseFloat(text) || 0 } : null)}
          keyboardType="numeric"
          style={styles.input}
        />
        <View style={styles.servingContainer}>
          <EditableTextInput
            label="Serving Size"
            value={selectedFood.serving_size?.toString() || '100'}
            onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, serving_size: parseFloat(text) || 100 } : null)}
            keyboardType="numeric"
            style={[styles.input, styles.servingSizeInput]}
          />
          <EditableTextInput
            label="Unit"
            value={selectedFood.serving_unit || 'g'}
            onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, serving_unit: text } : null)}
            style={[styles.input, styles.servingUnitInput]}
          />
        </View>
      </View>
    );
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    const sourceColor = getSourceColor(item.source || '', theme);

    return (
      <Card style={styles.foodCard} onPress={() => navigateToFoodDetails(item)}>
        <Card.Content style={styles.foodCardContent}>
          <Avatar.Icon
            size={50}
            icon={getSourceIcon(item.source || '')}
            style={{ backgroundColor: sourceColor }}
            color="#fff"
          />
          <View style={styles.foodInfo}>
            <Title style={[styles.foodName, { color: sourceColor }]}>{item.name}</Title>
            {item.brand && <Paragraph style={styles.brandName}>{item.brand}</Paragraph>}
            <View style={styles.nutritionInfo}>
              <Text style={styles.calories}>{item.calories} calories</Text>
              <Text style={styles.macros}>
                P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
              </Text>
              <Text style={styles.macros}>
                per {item.serving_size} {item.serving_unit}
              </Text>
            </View>
          </View>
          {item.source === 'custom' && (
            <View style={styles.rightActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteFood(item)}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={24}
                  color={theme.colors.error}
                />
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search foods..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            icon="magnify"
            clearIcon="close"
          />

          <TouchableOpacity
            style={styles.scanButton}
            onPress={navigateToScanBarcode}
          >
            <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading foods...</Text>
          </View>
        ) : filteredFoods.length === 0 ? (
          <EmptyState
            icon="food"
            title="No foods found"
            message={searchQuery
              ? `No foods found matching "${searchQuery}"`
              : "Add foods to your database or scan barcodes to get started"}
            actionLabel="Add Food"
            onAction={navigateToAddFood}
          />
        ) : (
          <FlatList
            data={filteredFoods}
            renderItem={renderFoodItem}
            keyExtractor={(item) => `${item.id}-${item.source || 'local'}`}
            contentContainerStyle={styles.foodList}
            refreshing={isRefreshing}
            onRefresh={() => fetchFoods(searchQuery, true)}
            ItemSeparatorComponent={() => <Divider />}
          />
        )}

        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="plus"
          onPress={navigateToAddFood}
          color="white"
        />
      </View>

      <Portal>
        <Dialog
          visible={isDeleteModalVisible}
          onDismiss={() => setIsDeleteModalVisible(false)}
        >
          <Dialog.Title>Delete Food</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{foodToDelete?.name}"?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDeleteModalVisible(false)}>Cancel</Button>
            <Button onPress={confirmDelete} textColor={theme.colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={isFoodDetailsVisible}
          onDismiss={() => {
            setIsFoodDetailsVisible(false);
            setSelectedFood(null);
          }}
          style={styles.detailsDialog}
        >
          <Dialog.Title>Food Details</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              {renderFoodDetails()}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setIsFoodDetailsVisible(false);
              setSelectedFood(null);
            }}>Cancel</Button>
            <Button onPress={handleSaveFood} mode="contained">
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    borderRadius: 8,
    elevation: 2,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  scanButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  foodList: {
    paddingBottom: 80,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  brandName: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  nutritionInfo: {
    marginTop: 4,
  },
  calories: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  macros: {
    fontSize: 14,
    color: '#757575',
  },
  rightActions: {
    marginLeft: 16,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  detailsDialog: {
    maxWidth: 400,
    width: '90%',
    alignSelf: 'center',
  },
  dialogContent: {
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  servingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  servingSizeInput: {
    flex: 2,
    marginRight: 8,
  },
  servingUnitInput: {
    flex: 1,
  },
});

export default FoodScreen;