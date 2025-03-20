import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl, TextInput } from 'react-native';
import {
  Searchbar,
  FAB,
  Text,
  Card,
  Title,
  Paragraph,
  Divider,
  Avatar,
  Chip,
  useTheme,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
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
import { getSourceIcon, getSourceColor } from '../../utils/foodUtils';
import { LoadingSpinner, SkeletonCard, LoadingOverlay } from '../../components/common';

type RouteParams = {
  scannedFood?: Food;
  refresh?: boolean;
  fromLog?: boolean;
  mealType?: string;
  date?: string;
};

const mapFoodItemToFood = (item: FoodItem): Food => ({
  id: typeof item.id === 'string' ? parseInt(item.id) : (typeof item.id === 'number' ? item.id : Date.now()),
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
  source: item.source as 'custom' | 'usda' | 'recipe',
  created_at: item.created_at || new Date().toISOString(),
  updated_at: item.updated_at || new Date().toISOString()
});

const FoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { fromLog } = (route.params as RouteParams) || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isFoodDetailsVisible, setIsFoodDetailsVisible] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});

  // Fetch foods function
  const fetchFoods = useCallback(async (query: string = '', forceRefresh: boolean = false) => {
    try {
      setIsLoading(!forceRefresh);
      if (forceRefresh) setIsRefreshing(true);

      let results;
      if (query.trim()) {
        results = await foodService.searchFood(query);
      } else {
        const customFoods = await foodService.getCustomFoods();
        const sortedFoods = customFoods
          .map(item => mapFoodItemToFood(item))
          .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

        results = {
          foods: sortedFoods,
          total: customFoods.length,
          page: 1,
          limit: 20
        };
      }

      const sortedResults = query.trim() ? results.foods : results.foods.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
      setFoods(sortedResults || []);
      setFilteredFoods(sortedResults || []);
    } catch (error) {
      console.error('Error fetching foods:', error);
      Alert.alert('Error', 'Failed to fetch foods. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Handle scanned food and refresh params
  useEffect(() => {
    const params = route.params as { scannedFood?: Food; refresh?: boolean } | undefined;

    if (params?.scannedFood) {
      setSelectedFood(params.scannedFood);
      setIsFoodDetailsVisible(true);
      navigation.setParams({ scannedFood: undefined });
    }
    if (params?.refresh) {
      fetchFoods(searchQuery, true);
      navigation.setParams({ refresh: undefined });
    }
  }, [route.params, navigation, fetchFoods, searchQuery]);

  // Initial load
  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchFoods(searchQuery, true);
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
    const { mealType, date } = route.params as { mealType?: string; date?: string };
    navigation.navigate('LogStack', {
      screen: 'AddFoodToLogModal',
      params: {
        food,
        mealType: mealType || 'snack',
        date: date || new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleSaveFood = async () => {
    if (!selectedFood) return;

    try {
      const foodData: CreateFoodDTO = {
        name: selectedFood.name.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
        calories: Math.round(selectedFood.calories || 0),
        protein: Math.round(selectedFood.protein || 0),
        carbs: Math.round(selectedFood.carbs || 0),
        fat: Math.round(selectedFood.fat || 0),
        serving_size: Math.round(Number(selectedFood.serving_size) || 100),
        serving_unit: selectedFood.serving_unit || '',
        barcode: selectedFood.barcode,
        brand: selectedFood.brand,
        source: 'custom',
        source_id: selectedFood.source_id,
      };

      let savedFoodId: number;

      if (selectedFood.id && selectedFood.source === 'custom') {
        // Update existing custom food
        const id = parseInt(selectedFood.id.toString());
        if (isNaN(id)) {
          throw new Error('Invalid food ID');
        }
        await foodService.updateCustomFood(id, foodData);
        savedFoodId = id;
      } else {
        // Create new custom food
        const result = await foodService.createCustomFood(foodData);
        if (!result || typeof result.id !== 'number') {
          throw new Error('Invalid response from createCustomFood');
        }
        savedFoodId = result.id;
      }

      // Just saving the food, stay on food screen
      setIsFoodDetailsVisible(false);
      setSelectedFood(null);
      fetchFoods(searchQuery, true);
      Alert.alert('Success', 'Food saved successfully!');
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
      await foodService.deleteFood(parseInt(foodToDelete.id.toString(), 10));
      await fetchFoods(searchQuery, true);
      setIsDeleteModalVisible(false);
      setFoodToDelete(null);
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Failed to delete food. Please try again.');
    }
  };

  const renderFoodDetails = () => {
    if (!selectedFood) return null;

    return (
      <View style={styles.detailsContainer}>
        {/* Food Details */}
        <Text style={styles.sectionLabel}>Food Details</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            value={selectedFood.name}
            onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, name: text } : null)}
            style={styles.input}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Brand</Text>
          <TextInput
            value={selectedFood.brand || ''}
            onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, brand: text } : null)}
            style={styles.input}
          />
        </View>

        {/* Serving Information */}
        <Text style={styles.sectionLabel}>Serving Information</Text>
        <View style={styles.servingRow}>
          <View style={styles.servingSizeContainer}>
            <Text style={styles.inputLabel}>Serving Size</Text>
            <TextInput
              value={selectedFood.serving_size?.toString() || '100'}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, serving_size: parseFloat(text) || 100 } : null)}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
          <View style={styles.servingUnitContainer}>
            <Text style={styles.inputLabel}>Unit</Text>
            <TextInput
              value={selectedFood.serving_unit || ''}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, serving_unit: text } : null)}
              style={styles.input}
            />
          </View>
        </View>

        {/* Nutrition Information */}
        <Text style={styles.sectionLabel}>Nutrition Information</Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionColumn}>
            <Text style={styles.nutritionHeader}>Calories</Text>
            <TextInput
              value={selectedFood.calories?.toString() || '0'}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, calories: parseFloat(text) || 0 } : null)}
              keyboardType="numeric"
              style={styles.nutritionInput}
            />
          </View>
          <View style={styles.nutritionColumn}>
            <Text style={styles.nutritionHeader}>Protein (g)</Text>
            <TextInput
              value={selectedFood.protein?.toString() || '0'}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, protein: parseFloat(text) || 0 } : null)}
              keyboardType="numeric"
              style={styles.nutritionInput}
            />
          </View>
          <View style={styles.nutritionColumn}>
            <Text style={styles.nutritionHeader}>Carbs (g)</Text>
            <TextInput
              value={selectedFood.carbs?.toString() || '0'}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, carbs: parseFloat(text) || 0 } : null)}
              keyboardType="numeric"
              style={styles.nutritionInput}
            />
          </View>
          <View style={styles.nutritionColumn}>
            <Text style={styles.nutritionHeader}>Fat (g)</Text>
            <TextInput
              value={selectedFood.fat?.toString() || '0'}
              onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, fat: parseFloat(text) || 0 } : null)}
              keyboardType="numeric"
              style={styles.nutritionInput}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    const sourceIcon = getSourceIcon(item.source);
    const sourceColor = getSourceColor(item.source, theme);

    const handleFoodPress = (food: Food) => {
      setSelectedFood(food);
      setIsFoodDetailsVisible(true);
    };

    return (
      <Card
        style={styles.foodCard}
        onPress={() => handleFoodPress(item)}
      >
        <Card.Content style={styles.cardContent}>
          <Avatar.Icon
            size={48}
            icon={sourceIcon}
            color={sourceColor}
            style={[styles.sourceIcon, { backgroundColor: `${sourceColor}20` }]}
          />

          <View style={styles.foodInfoContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.foodName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.servingInfo}>
                {item.serving_size || 100}{item.serving_unit || 'g'}
              </Text>
              {fromLog ? (
                <TouchableOpacity onPress={() => handleAddToLog(item)}>
                  <Avatar.Icon
                    size={24}
                    icon="plus"
                    color={theme.colors.primary}
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
              ) : (
                <Avatar.Icon
                  size={24}
                  icon="chevron-right"
                  color={theme.colors.onSurfaceVariant}
                  style={styles.chevron}
                />
              )}
            </View>

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
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
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
      backgroundColor: theme.colors.background,
      flex: 1,
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
      padding: 16,
      paddingBottom: 80, // Add padding for FAB
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
    chevron: {
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
    detailsDialog: {
      maxHeight: '80%',
      backgroundColor: theme.colors.surface,
    },
    dialogContent: {
      padding: 16,
    },
    detailsContainer: {
      padding: 16,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    input: {
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      color: theme.colors.onSurface,
    },
    servingRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    servingSizeContainer: {
      flex: 2,
    },
    servingUnitContainer: {
      flex: 1,
    },
    nutritionColumn: {
      flex: 1,
      minWidth: '45%',
    },
    nutritionHeader: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
    },
    nutritionInput: {
      height: 40,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.background,
      color: theme.colors.onSurface,
      textAlign: 'center',
    },
    macroContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
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
      color: theme.colors.onSurfaceVariant,
    },
    actionButton: {
      margin: 0,
      padding: 0,
    },
    listContent: {
      paddingVertical: 8,
    },
    addButton: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 65,
      zIndex: -1,
    },
  });

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

        <TouchableOpacity
          style={styles.scanButton}
          onPress={navigateToScanBarcode}
        >
          <Ionicons name="barcode-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard style={{ width: '100%' }} />
          <SkeletonCard style={{ width: '100%' }} />
          <SkeletonCard style={{ width: '100%' }} />
          <SkeletonCard style={{ width: '100%' }} />
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          keyExtractor={(item, index) => {
            if (item?.id) return item.id.toString();
            return `temp-${index}-${Date.now()}`;
          }}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchFoods('', true)}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="food-apple"
              title="No Foods Found"
              message={searchQuery ? "Try a different search term" : "Add your first food item"}
              actionLabel="Add Food"
              onAction={() => navigateToAddFood()}
            />
          }
        />
      )}

      <Portal>
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
            {selectedFood?.source === 'custom' && (
              <Button
                onPress={() => {
                  setFoodToDelete(selectedFood);
                  setIsDeleteModalVisible(true);
                  setIsFoodDetailsVisible(false);
                }}
                textColor={theme.colors.error}
              >
                Delete
              </Button>
            )}
            <Button onPress={handleSaveFood} mode="contained">
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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
            <Button onPress={confirmDelete} mode="contained" textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Single FAB for adding food */}
        {isFocused && (
          <FAB
            icon="plus"
            label="Add Food"
            onPress={() => navigation.navigate('AddFood')}
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            color={theme.colors.onPrimary}
          />
        )}
      </Portal>

      {/* Add loading overlay for delete operation */}
      <LoadingOverlay visible={Object.values(isDeleting).some(Boolean)} message="Deleting food..." />
    </View>
  );
};

export default FoodScreen;