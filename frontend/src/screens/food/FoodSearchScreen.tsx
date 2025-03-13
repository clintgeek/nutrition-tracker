import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput as RNTextInput,
  Alert
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Divider,
  useTheme,
  Searchbar,
  Chip,
  Avatar,
  Portal,
  Dialog,
  FAB
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { apiService, setAuthToken } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { foodLogService } from '../../services/foodLogService';

// API response interface
interface FoodApiResponse {
  data: {
    message: string;
    food: {
      id: number;
      name: string;
      calories_per_serving: number;
      protein_grams: number;
      carbs_grams: number;
      fat_grams: number;
      serving_size: string;
      serving_unit: string;
      source: string;
      source_id: string;
    };
  }
}

// API search response interface
interface ApiSearchResponse {
  foods: Array<{
    id?: number;
    source_id: string;
    name: string;
    brand?: string;
    calories_per_serving?: number;
    protein_grams?: number;
    carbs_grams?: number;
    fat_grams?: number;
    serving_size?: string;
    serving_unit?: string;
    source: string;
  }>;
  total?: number;
  page?: number;
  limit?: number;
}

// Food item interface
interface FoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

// Simplified food item for display
interface SimplifiedFoodItem {
  id: string | number;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingSizeUnit?: string;
  source?: string;
}

// Helper functions for source display
const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'leaf';  // Leaf icon for USDA
    case 'nutritionix':
      return 'check-decagram';  // Verified icon for Nutritionix
    case 'openfoodfacts':
      return 'database';  // Database icon for OpenFoodFacts
    case 'custom':
      return 'food-apple';  // Apple icon for custom foods
    default:
      return 'food';
  }
};

const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';  // Green for USDA
    case 'nutritionix':
      return '#2196F3';  // Blue for Nutritionix
    case 'openfoodfacts':
      return '#FF9800';  // Orange for OpenFoodFacts
    case 'custom':
      return theme.colors.primary;  // Theme color for custom foods
    default:
      return theme.colors.primary;
  }
};

const FoodSearchScreen: React.FC = ({ route, navigation }: any) => {
  const theme = useTheme();
  const { token } = useAuth();
  const initialQuery = route.params?.searchQuery || '';

  // Derive addToLog state from route params using useMemo
  const addToLogMode = React.useMemo(() => {
    const mode = {
      isAddingToLog: !!route.params?.addToLog,
      logDate: route.params?.logDate || new Date().toISOString().split('T')[0],
      mealType: route.params?.mealType || 'snack'
    };
    return mode;
  }, [route.params?.addToLog, route.params?.logDate, route.params?.mealType]);

  // Move navigation state updates to useLayoutEffect
  React.useLayoutEffect(() => {
    const parent = navigation.getParent();

    if (addToLogMode.isAddingToLog) {
      navigation.setOptions({
        title: 'Add Food To Your Log'
      });

      if (parent) {
        parent.setOptions({
          tabBarState: {
            activeTab: 'Log'
          }
        });
      }
    } else {
      navigation.setOptions({
        title: 'Search Foods'
      });

      if (parent) {
        parent.setOptions({
          tabBarState: {
            activeTab: 'Foods'
          }
        });
      }
    }

    // Cleanup navigation state when unmounting
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarState: {
            activeTab: 'Foods'
          }
        });
      }
    };
  }, [addToLogMode, navigation]);

  // Update state when route params change
  useEffect(() => {
    setIsAddingToLog(addToLogMode.isAddingToLog);
    setLogDate(addToLogMode.logDate);
    setMealType(addToLogMode.mealType);

    if (addToLogMode.isAddingToLog && !searchQuery.trim()) {
      searchFoods();
    }
  }, [addToLogMode]);

  // Set token in apiService when it changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  // Search automatically when screen loads with a search query
  useEffect(() => {
    if (initialQuery) {
      searchFoods();
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SimplifiedFoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<SimplifiedFoodItem | null>(null);

  // Add to log state - initialize from memoized values
  const [showAddToLogModal, setShowAddToLogModal] = useState(false);
  const [logDate, setLogDate] = useState<string>(addToLogMode.logDate);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(addToLogMode.mealType);
  const [servings, setServings] = useState('1');
  const [isAddingToLog, setIsAddingToLog] = useState(addToLogMode.isAddingToLog);

  // Add debounced search
  React.useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchFoods();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  // Function to search for foods
  const searchFoods = async () => {
    // If we're adding to log and there's no search query, get all foods sorted by recent use
    if (isAddingToLog && !searchQuery.trim()) {
      setLoading(true);
      setSearchResults([]);

      try {
        const response = await apiService.get<ApiSearchResponse>('/foods/recent', {
          params: {
            limit: 50
          }
        });

        console.log('Recent foods response:', response);

        if (response?.foods) {
          const searchResults = response.foods.map(food => ({
            id: food.id || food.source_id,
            name: food.name,
            brand: food.brand,
            calories: food.calories_per_serving || 0,
            protein: food.protein_grams || 0,
            carbs: food.carbs_grams || 0,
            fat: food.fat_grams || 0,
            servingSize: food.serving_size ? parseFloat(food.serving_size) : undefined,
            servingSizeUnit: food.serving_unit,
            source: food.source
          }));

          console.log('Transformed search results:', searchResults);
          setSearchResults(searchResults);
        } else {
          console.log('No foods found in response:', response);
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Error getting recent foods:', error);
        alert('Error loading foods. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Regular search logic for when there's a search query
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      const response = await apiService.get<ApiSearchResponse>('/foods/search', {
        params: {
          query: searchQuery,
          page: 1,
          limit: 25
        }
      });

      console.log('Search response:', response);

      if (response?.foods) {
        const searchResults = response.foods.map(food => ({
          id: food.id || food.source_id,
          name: food.name,
          brand: food.brand,
          calories: food.calories_per_serving || 0,
          protein: food.protein_grams || 0,
          carbs: food.carbs_grams || 0,
          fat: food.fat_grams || 0,
          servingSize: food.serving_size ? parseFloat(food.serving_size) : undefined,
          servingSizeUnit: food.serving_unit,
          source: food.source
        }));

        console.log('Transformed search results:', searchResults);
        setSearchResults(searchResults);
      } else {
        console.log('No foods found in response:', response);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching foods:', error);
      alert('Error searching for foods. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to import a food to the local database
  const importFood = async (food: SimplifiedFoodItem) => {
    try {
      // Ensure we have a token
      if (!token) {
        alert('Please log in to import foods');
        return;
      }

      // Set the token in apiService
      setAuthToken(token);

      // Convert the food item to our database format
      const foodData = {
        name: food.name,
        calories_per_serving: food.calories,
        protein_grams: food.protein,
        carbs_grams: food.carbs,
        fat_grams: food.fat,
        serving_size: food.servingSize?.toString() || '100',
        serving_unit: food.servingSizeUnit || 'g',
        source: food.source || 'unknown',
        source_id: `${food.source}-${food.id}`
      };

      // Make API call to save the food using apiService
      const response = await apiService.post<FoodApiResponse>('/foods/custom', foodData);

      if (response?.data?.food && response.data.food.id) {
        // Show success message
        alert(`${food.name} has been added to your food database!`);

        // Navigate back to the food list
        navigation.goBack();
      } else {
        console.error('Invalid response format:', response);
        throw new Error('Failed to save food item: Invalid response format');
      }
    } catch (error) {
      console.error('Error importing food:', error);
      if (axios.isAxiosError(error)) {
        console.error('Import error details:', error.response?.data);
        console.error('Import error status:', error.response?.status);
        if (error.response?.status === 401) {
          alert('Your session has expired. Please log in again.');
          // You might want to navigate to the login screen here
          return;
        }
      }
      alert('Failed to import food. Please try again.');
    }
  };

  // Function to add food directly to log
  const addFoodToLog = async () => {
    if (!selectedFood) return;

    try {
      // Ensure we have a token
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to add foods to your log.');
        return;
      }

      setIsAddingToLog(true);

      // First import the food to get a proper ID
      const foodData = {
        name: selectedFood.name,
        calories_per_serving: selectedFood.calories,
        protein_grams: selectedFood.protein,
        carbs_grams: selectedFood.carbs,
        fat_grams: selectedFood.fat,
        serving_size: selectedFood.servingSize?.toString() || '100',
        serving_unit: selectedFood.servingSizeUnit || 'g',
        source: selectedFood.source || 'unknown',
        source_id: `${selectedFood.source}-${selectedFood.id}`
      };

      // Make API call to save the food
      const response = await apiService.post<FoodApiResponse>('/foods/custom', foodData);

      if (response?.data?.food && response.data.food.id) {
        // Now add to the log
        await foodLogService.createLog({
          food_item_id: Number(response.data.food.id),
          log_date: logDate,
          meal_type: mealType,
          servings: parseFloat(servings) || 1,
        });

        // Show success message and navigate back
        Alert.alert(
          'Success',
          `${selectedFood.name} has been added to your log!`,
          [{
            text: 'OK',
            onPress: () => {
              setShowAddToLogModal(false);
              setSelectedFood(null);
              navigation.goBack();
            }
          }]
        );
      } else {
        throw new Error('Failed to save food item: Invalid response format');
      }
    } catch (error) {
      console.error('Error adding food to log:', error);
      Alert.alert('Error', 'Failed to add food to your log. Please try again.');
    } finally {
      setIsAddingToLog(false);
    }
  };

  // Render a food item
  const renderFoodItem = ({ item }: { item: SimplifiedFoodItem }) => (
    <TouchableOpacity onPress={() => setSelectedFood(item)}>
      <Card style={[styles.foodCard, selectedFood?.id === item.id && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
        <Card.Content style={styles.foodCardContent}>
          <Avatar.Icon
            size={40}
            icon={getSourceIcon(item.source || '')}
            style={{ backgroundColor: getSourceColor(item.source || '', theme) }}
            color="#fff"
          />
          <View style={styles.foodInfo}>
            <Title numberOfLines={1}>{item.name}</Title>
            {item.brand && <Text style={styles.brandText}>{item.brand}</Text>}
            {item.source && <Text style={styles.sourceText}>Source: {item.source}</Text>}

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
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Add cleanup for add-to-log mode when screen is unfocused
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // Reset the add-to-log mode when leaving the screen
      setIsAddingToLog(false);
      setLogDate(new Date().toISOString().split('T')[0]);
      setMealType('snack');
      setSelectedFood(null);
      setShowAddToLogModal(false);
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search foods..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchFoods}
          style={styles.searchBar}
        />
        <Button
          mode="contained"
          onPress={searchFoods}
          style={styles.searchButton}
          disabled={loading || !searchQuery.trim() || searchQuery.trim().length < 2}
        >
          Search
        </Button>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching for foods...</Text>
        </View>
      ) : (
        <>
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.resultsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="food-apple" size={64} color={theme.colors.primary} />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No foods found. Try a different search term.' : 'Search for foods to add to your database.'}
              </Text>
            </View>
          )}
        </>
      )}

      {selectedFood && (
        <View style={styles.actionContainer}>
          {!isAddingToLog && (
            <Button
              mode="contained"
              onPress={() => importFood(selectedFood)}
              style={styles.actionButton}
            >
              Import {selectedFood.name}
            </Button>
          )}
          <Button
            mode="contained"
            onPress={() => setShowAddToLogModal(true)}
            style={[styles.actionButton, { marginTop: !isAddingToLog ? 8 : 0 }]}
            icon="notebook"
          >
            Add to Log
          </Button>
        </View>
      )}

      {!isAddingToLog && (
        <Portal>
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => navigation.navigate('AddFood')}
          />
        </Portal>
      )}

      <Portal>
        <Dialog
          visible={showAddToLogModal}
          onDismiss={() => setShowAddToLogModal(false)}
          style={styles.modalContainer}
        >
          <Dialog.Title>Add to Food Log</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <Dialog.Content>
                <Text style={styles.modalText}>
                  Add {selectedFood?.name} to your log for {new Date(logDate).toLocaleDateString()}
                </Text>

                <View style={styles.mealTypeContainer}>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                    <Chip
                      key={type}
                      selected={mealType === type}
                      onPress={() => setMealType(type as 'breakfast' | 'lunch' | 'dinner' | 'snack')}
                      style={styles.mealTypeChip}
                      selectedColor={theme.colors.primary}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Chip>
                  ))}
                </View>

                <View style={styles.servingsContainer}>
                  <Text style={styles.servingsLabel}>Servings:</Text>
                  <RNTextInput
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                    style={styles.servingsInput}
                    maxLength={4}
                  />
                </View>

                <Divider style={styles.divider} />

                <Text style={styles.nutritionTitle}>Nutrition Information (per serving)</Text>

                <View style={styles.nutritionContainer}>
                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Calories:</Text>
                    <RNTextInput
                      value={selectedFood?.calories.toString()}
                      onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, calories: parseFloat(value) || 0} : null)}
                      keyboardType="numeric"
                      style={styles.nutritionInput}
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Protein (g):</Text>
                    <RNTextInput
                      value={selectedFood?.protein.toString()}
                      onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, protein: parseFloat(value) || 0} : null)}
                      keyboardType="numeric"
                      style={styles.nutritionInput}
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Carbs (g):</Text>
                    <RNTextInput
                      value={selectedFood?.carbs.toString()}
                      onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, carbs: parseFloat(value) || 0} : null)}
                      keyboardType="numeric"
                      style={styles.nutritionInput}
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Fat (g):</Text>
                    <RNTextInput
                      value={selectedFood?.fat.toString()}
                      onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, fat: parseFloat(value) || 0} : null)}
                      keyboardType="numeric"
                      style={styles.nutritionInput}
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.nutritionRow}>
                    <Text style={styles.nutritionLabel}>Serving Size:</Text>
                    <View style={styles.servingSizeContainer}>
                      <RNTextInput
                        value={selectedFood?.servingSize?.toString() || '100'}
                        onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, servingSize: parseFloat(value) || 0} : null)}
                        keyboardType="numeric"
                        style={[styles.nutritionInput, styles.servingSizeInput]}
                        maxLength={6}
                      />
                      <RNTextInput
                        value={selectedFood?.servingSizeUnit || 'g'}
                        onChangeText={(value) => setSelectedFood(prev => prev ? {...prev, servingSizeUnit: value} : null)}
                        style={[styles.nutritionInput, styles.servingUnitInput]}
                        maxLength={10}
                      />
                    </View>
                  </View>
                </View>
              </Dialog.Content>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowAddToLogModal(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={addFoodToLog}
              loading={isAddingToLog}
              disabled={isAddingToLog}
            >
              Add to Log
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    height: 50,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  resultsList: {
    padding: 16,
  },
  foodCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  foodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  brandText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  macroContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  macroLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  actionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: 'white',
  },
  actionButton: {
    height: 50,
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalText: {
    marginBottom: 16,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  mealTypeChip: {
    margin: 4,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  servingsLabel: {
    marginRight: 8,
    fontSize: 16,
  },
  servingsInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 16,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  nutritionContainer: {
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutritionLabel: {
    fontSize: 16,
    flex: 1,
  },
  nutritionInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    width: 100,
    textAlign: 'right',
  },
  servingSizeContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  servingSizeInput: {
    width: 60,
    marginRight: 8,
  },
  servingUnitInput: {
    width: 60,
    textAlign: 'left',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default FoodSearchScreen;