import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput, Alert, Keyboard, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Title, useTheme, Text, Chip, Searchbar, Card, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { CreateFoodDTO } from '../../types/Food';
import { foodService } from '../../services/foodService';
import { foodLogService } from '../../services/foodLogService';
import { useAuth } from '../../contexts/AuthContext';

const AddFoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, token } = useAuth();  // Get auth state

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Custom food form state
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // For adding to log
  const [isAddingToLog, setIsAddingToLog] = useState(false);
  const [logDate, setLogDate] = useState<string | undefined>(undefined);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  const [servings, setServings] = useState('1');

  // Check if we're adding to the log
  useEffect(() => {
    if (route.params) {
      const { addToLog, logDate: date, mealType: meal } = route.params as any;
      setIsAddingToLog(!!addToLog);
      setLogDate(date);
      setMealType((meal || 'snack') as 'breakfast' | 'lunch' | 'dinner' | 'snack');
    }
  }, [route.params]);

  // Function to search for foods
  const searchFoods = async () => {
    // Require at least 2 characters for search
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      Alert.alert('Search Error', 'Please enter at least 2 characters to search');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setError('');

    try {
      const response = await foodService.searchFood(searchQuery);
      console.log('Search response:', response); // Add logging

      if (response.foods) {
        const mappedResults = response.foods.map(food => ({
          id: food.id || food.source_id,
          name: food.name || '',
          brand: food.brand,
          calories: food.calories || 0,
          protein: food.protein || 0,
          carbs: food.carbs || 0,
          fat: food.fat || 0,
          serving_size: food.serving_size ? parseFloat(food.serving_size.toString()) : 1,
          serving_unit: food.serving_unit || 'serving',
          source: food.source
        }));

        console.log('Mapped results:', mappedResults); // Add logging
        setSearchResults(mappedResults);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        Alert.alert('No Results', 'No foods found matching your search. Try a different search term or create a custom food.');
      }
    } catch (err) {
      console.error('Error searching foods:', err);
      setError('Failed to search for foods. Please try again.');
      Alert.alert('Error', 'Failed to search for foods. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Function to select a food from search results
  const selectFood = (food) => {
    // Populate the form with the selected food's data
    setName(food.name || '');
    setCalories(food.calories?.toString() || '');
    setProtein(food.protein?.toString() || '');
    setCarbs(food.carbs?.toString() || '');
    setFat(food.fat?.toString() || '');
    setServingSize(food.serving_size?.toString() || '1');
    setServingUnit(food.serving_unit || 'serving');

    // Hide search results
    setShowSearchResults(false);
  };

  // Function to validate the form
  const validateForm = () => {
    if (!name.trim()) {
      setError('Food name is required');
      return false;
    }

    if (!calories.trim() || isNaN(Number(calories))) {
      setError('Valid calories value is required');
      return false;
    }

    // Validate protein, carbs, fat if provided
    if (protein.trim() && isNaN(Number(protein))) {
      setError('Protein must be a valid number');
      return false;
    }

    if (carbs.trim() && isNaN(Number(carbs))) {
      setError('Carbs must be a valid number');
      return false;
    }

    if (fat.trim() && isNaN(Number(fat))) {
      setError('Fat must be a valid number');
      return false;
    }

    // Validate serving size
    if (!servingSize.trim() || isNaN(Number(servingSize)) || Number(servingSize) <= 0) {
      setError('Valid serving size is required');
      return false;
    }

    // Validate serving unit
    if (!servingUnit.trim()) {
      setError('Serving unit is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    // Check authentication first
    if (!user || !token) {
      setError('You must be logged in to add custom foods.');
      return;
    }

    Keyboard.dismiss();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const foodData: CreateFoodDTO = {
      name: name.trim(),
      calories: Math.round(Number(calories)),
      protein: Number(parseFloat(protein || '0').toFixed(1)),
      carbs: Number(parseFloat(carbs || '0').toFixed(1)),
      fat: Number(parseFloat(fat || '0').toFixed(1)),
      serving_size: Number(servingSize) || 1,
      serving_unit: servingUnit.trim() || 'serving',
      source: 'custom'  // Required field for the backend
    };

    try {
      console.log('Creating custom food:', foodData);

      // If we're adding to the log, create the log directly with the food data
      if (isAddingToLog && logDate) {
        try {
          await foodLogService.createLog({
            log_date: logDate,
            meal_type: mealType,
            servings: parseFloat(servings) || 1,
            food_item: foodData
          });
          console.log('Food added to log successfully');
        } catch (logError) {
          console.error('Error adding food to log:', logError);
          Alert.alert('Error', 'Could not add food to your log.');
          setIsLoading(false);
          return;
        }
      } else {
        // If we're just creating the food item, use the food service
        const result = await foodService.createCustomFood(foodData);
        console.log('Food created successfully:', result);
      }

      // Clear form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setServingSize('1');
      setServingUnit('serving');

      setIsLoading(false);

      // Show success message
      Alert.alert(
        'Success',
        isAddingToLog ? 'Food added to your log!' : 'Food created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (!isAddingToLog) {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating food:', error);
      setError('Could not create food. Please try again.');
      setIsLoading(false);
    }
  };

  // Render a food item in the search results
  const renderFoodItem = ({ item }) => (
    <TouchableOpacity onPress={() => selectFood(item)}>
      <Card style={styles.foodCard}>
        <Card.Content>
          <View style={styles.foodItemContent}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName} numberOfLines={1}>{item.name || 'Unnamed Food'}</Text>
              {item.brand && <Text style={styles.foodBrand} numberOfLines={1}>{item.brand}</Text>}
              <Text style={styles.foodCalories}>
                {Math.round(item.calories || 0)} calories
                {item.serving_size && item.serving_unit ? ` per ${item.serving_size} ${item.serving_unit}` : ''}
              </Text>
              <View style={styles.macrosContainer}>
                <Text style={styles.macroText}>P: {Math.round(item.protein || 0)}g</Text>
                <Text style={styles.macroText}>C: {Math.round(item.carbs || 0)}g</Text>
                <Text style={styles.macroText}>F: {Math.round(item.fat || 0)}g</Text>
              </View>
            </View>
            <View style={styles.sourceTag}>
              <Chip
                size={20}
                style={{ backgroundColor: item.source === 'custom' ? '#e1f5fe' : '#f1f8e9' }}
              >
                {item.source || 'unknown'}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Title style={styles.title}>Add Custom Food</Title>

        {error ? <View style={styles.errorContainer}><Text style={styles.error}>{error}</Text></View> : null}

        {/* Search section */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search for existing foods..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={searchFoods}
            style={styles.searchBar}
          />
          <Button
            mode="contained"
            onPress={searchFoods}
            style={styles.searchButton}
            disabled={isSearching || !searchQuery.trim() || searchQuery.trim().length < 2}
          >
            Search
          </Button>
        </View>

        {/* Search results */}
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Searching for foods...</Text>
          </View>
        ) : showSearchResults && searchResults.length > 0 ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>Search Results</Text>
            <Text style={styles.searchResultsSubtitle}>Tap a food to use as a starting point</Text>
            <FlatList
              data={searchResults}
              renderItem={renderFoodItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.searchResultsList}
              scrollEnabled={false}
            />
            <Button
              mode="outlined"
              onPress={() => setShowSearchResults(false)}
              style={styles.hideResultsButton}
            >
              Hide Results
            </Button>
          </View>
        ) : null}

        {/* Divider between search and form */}
        <Divider style={styles.divider} />

        {isAddingToLog && (
          <View style={styles.addToLogInfo}>
            <Text style={styles.addToLogText}>
              This food will be added to your log for {new Date(logDate || '').toLocaleDateString()}
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
          </View>
        )}

        <Text style={styles.formTitle}>Food Details</Text>

        <RNTextInput
          placeholder="Food Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
          returnKeyType="next"
          maxLength={100}
        />

        <RNTextInput
          placeholder="Calories (per serving) *"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          style={styles.input}
          returnKeyType="next"
          maxLength={4}
        />

        <View style={styles.row}>
          <RNTextInput
            placeholder="Protein (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Carbs (g)"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Fat (g)"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />
        </View>

        <View style={styles.row}>
          <RNTextInput
            placeholder="Serving Size *"
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Serving Unit *"
            value={servingUnit}
            onChangeText={setServingUnit}
            style={[styles.input, { flex: 2 }]}
            returnKeyType="done"
            maxLength={20}
            onSubmitEditing={handleSubmit}
          />
        </View>

        <Text style={styles.hint}>* Required fields</Text>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          Add Food
        </Button>
      </View>
    </ScrollView>
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
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  button: {
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  error: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  addToLogInfo: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  addToLogText: {
    marginBottom: 8,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 8,
  },
  mealTypeChip: {
    margin: 4,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  servingsLabel: {
    marginRight: 8,
  },
  servingsInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'white',
  },
  searchButton: {
    paddingHorizontal: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  searchResultsContainer: {
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchResultsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  foodCard: {
    marginBottom: 8,
  },
  foodItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodBrand: {
    fontSize: 14,
    color: '#666',
  },
  foodCalories: {
    fontSize: 14,
    marginTop: 4,
  },
  macrosContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  macroText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  sourceTag: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  hideResultsButton: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
});

export default AddFoodScreen;