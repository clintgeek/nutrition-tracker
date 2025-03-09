import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput as RNTextInput
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Divider,
  useTheme,
  Searchbar,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { apiService, setAuthToken } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

// USDA API configuration
const USDA_API_KEY = 'jrHM0qobnLkHbRdSATHkU7sBaEqqXcB85R7rTPM7'; // Using the key from .env
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

// API response interface
interface FoodApiResponse {
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
  id: number;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: number;
  servingSizeUnit?: string;
}

const FoodSearchScreen: React.FC = ({ route, navigation }: any) => {
  const theme = useTheme();
  const { token } = useAuth();
  const initialQuery = route.params?.searchQuery || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SimplifiedFoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<SimplifiedFoodItem | null>(null);
  const [dataSource, setDataSource] = useState<'usda' | 'nutritionix' | 'openfoodfacts'>('usda');

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

  // Function to search for foods
  const searchFoods = async () => {
    // Require at least 2 characters for search
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      alert('Please enter at least 2 characters to search');
      return;
    }

    setLoading(true);
    setSearchResults([]);

    try {
      // USDA FoodData Central API
      if (dataSource === 'usda') {
        console.log('Searching USDA API with key:', USDA_API_KEY);
        console.log('Search query:', searchQuery);

        const response = await axios.get(`${USDA_API_URL}/foods/search`, {
          params: {
            api_key: USDA_API_KEY,
            query: searchQuery,
            pageSize: 25,
          }
        });

        console.log('USDA API response status:', response.status);
        console.log('USDA API response data:', JSON.stringify(response.data).substring(0, 200) + '...');

        if (response.data && response.data.foods) {
          const simplifiedResults = response.data.foods.map((food: FoodItem) => {
            // Find nutrients by nutrient ID instead of name
            // USDA nutrient IDs: Energy (kcal): 1008, Protein: 1003, Carbs: 1005, Fat: 1004
            const calories = food.foodNutrients.find(n => n.nutrientId === 1008)?.value ||
                            food.foodNutrients.find(n => n.nutrientName?.includes('Energy') && n.unitName?.includes('KCAL'))?.value || 0;

            const protein = food.foodNutrients.find(n => n.nutrientId === 1003)?.value ||
                           food.foodNutrients.find(n => n.nutrientName?.includes('Protein'))?.value || 0;

            const carbs = food.foodNutrients.find(n => n.nutrientId === 1005)?.value ||
                         food.foodNutrients.find(n => n.nutrientName?.includes('Carbohydrate'))?.value || 0;

            const fat = food.foodNutrients.find(n => n.nutrientId === 1004)?.value ||
                       food.foodNutrients.find(n => n.nutrientName?.includes('Total lipid') || n.nutrientName?.includes('Fat'))?.value || 0;

            return {
              id: food.fdcId,
              name: food.description,
              brand: food.brandOwner,
              calories,
              protein,
              carbs,
              fat,
              servingSize: food.servingSize,
              servingSizeUnit: food.servingSizeUnit
            };
          });

          console.log('Simplified results count:', simplifiedResults.length);
          setSearchResults(simplifiedResults);
        } else {
          console.log('No foods found in response');
        }
      }
      // Add other API implementations here
    } catch (error) {
      console.error('Error searching for foods:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', error.response?.data);
        console.error('Axios error status:', error.response?.status);
        console.error('Axios error headers:', error.response?.headers);
      }
      // Show error message to user
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
        source: 'usda',
        source_id: `usda-${food.id}`
      };

      // Make API call to save the food using apiService
      const response = await apiService.post<FoodApiResponse>('/foods/custom', foodData);

      if (response?.food && response.food.id) {
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

  // Render a food item
  const renderFoodItem = ({ item }: { item: SimplifiedFoodItem }) => (
    <TouchableOpacity onPress={() => setSelectedFood(item)}>
      <Card style={[styles.foodCard, selectedFood?.id === item.id && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
        <Card.Content>
          <Title numberOfLines={1}>{item.name}</Title>
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
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search for foods..."
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

      <View style={styles.dataSourceContainer}>
        <Text style={styles.dataSourceLabel}>Data Source:</Text>
        <View style={styles.chipContainer}>
          <Chip
            selected={dataSource === 'usda'}
            onPress={() => setDataSource('usda')}
            style={styles.chip}
          >
            USDA
          </Chip>
          <Chip
            selected={dataSource === 'nutritionix'}
            onPress={() => setDataSource('nutritionix')}
            style={styles.chip}
            disabled
          >
            Nutritionix
          </Chip>
          <Chip
            selected={dataSource === 'openfoodfacts'}
            onPress={() => setDataSource('openfoodfacts')}
            style={styles.chip}
            disabled
          >
            Open Food Facts
          </Chip>
        </View>
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
        <View style={styles.importContainer}>
          <Button
            mode="contained"
            onPress={() => importFood(selectedFood)}
            style={styles.importButton}
          >
            Import {selectedFood.name}
          </Button>
        </View>
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
  dataSourceContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  dataSourceLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
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
  brandText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
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
  importContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: 'white',
  },
  importButton: {
    height: 50,
    justifyContent: 'center',
  },
});

export default FoodSearchScreen;