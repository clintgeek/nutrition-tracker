import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Button, Title, Text, Card, Divider, useTheme } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';

import { foodService } from '../../services/foodService';
import { foodLogService } from '../../services/foodLogService';

const AddLogScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // Get date and meal type from route params
  const { date = new Date().toISOString().split('T')[0], mealType = 'snack' } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [servings, setServings] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  // Search for foods when query changes
  useEffect(() => {
    const searchFoods = async () => {
      if (!searchQuery.trim()) {
        setFoods([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await foodService.searchFood(searchQuery);
        setFoods(results);
      } catch (err) {
        console.error('Food search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchFoods, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectFood = (food) => {
    setSelectedFood(food);
  };

  const handleAddLog = async () => {
    if (!selectedFood) {
      setError('Please select a food item');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await foodLogService.createLog({
        food_item_id: selectedFood.id,
        log_date: date,
        meal_type: mealType,
        servings: parseFloat(servings) || 1,
      });

      // Navigate back to the log screen
      navigation.goBack();
    } catch (err) {
      setError('Failed to add food log. Please try again.');
      console.error('Add log error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFoodItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectFood(item)}>
      <Card style={styles.foodCard}>
        <Card.Content>
          <Text style={styles.foodName}>{item.name}</Text>
          <Text style={styles.foodCalories}>{item.calories_per_serving} calories per serving</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Add Food to Log</Title>

        {error ? <View style={styles.errorContainer}><Text style={styles.error}>{error}</Text></View> : null}

        {selectedFood ? (
          <View style={styles.selectedFoodContainer}>
            <Card style={styles.selectedFoodCard}>
              <Card.Content>
                <Text style={styles.selectedFoodTitle}>Selected Food</Text>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                <Text style={styles.selectedFoodCalories}>
                  {selectedFood.calories_per_serving} calories per serving
                </Text>

                <View style={styles.servingsContainer}>
                  <Text style={styles.servingsLabel}>Servings:</Text>
                  <TextInput
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                    style={styles.servingsInput}
                  />
                </View>

                <Button
                  mode="contained"
                  onPress={handleAddLog}
                  style={styles.addButton}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Add to Log
                </Button>

                <Button
                  mode="outlined"
                  onPress={() => setSelectedFood(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </Card.Content>
            </Card>
          </View>
        ) : (
          <>
            <TextInput
              placeholder="Search for a food..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />

            {isSearching ? (
              <Text style={styles.searchingText}>Searching...</Text>
            ) : foods.length > 0 ? (
              <FlatList
                data={foods}
                renderItem={renderFoodItem}
                keyExtractor={(item) => item.id.toString()}
                ItemSeparatorComponent={() => <Divider />}
                style={styles.foodList}
              />
            ) : searchQuery.trim() ? (
              <Text style={styles.noResultsText}>No foods found matching "{searchQuery}"</Text>
            ) : null}
          </>
        )}
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
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  foodList: {
    marginBottom: 16,
  },
  foodCard: {
    marginVertical: 4,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  foodCalories: {
    color: '#666',
  },
  selectedFoodContainer: {
    marginBottom: 16,
  },
  selectedFoodCard: {
    marginBottom: 16,
  },
  selectedFoodTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedFoodName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedFoodCalories: {
    fontSize: 16,
    marginBottom: 16,
  },
  servingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  servingsLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  servingsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    width: 60,
    backgroundColor: 'white',
  },
  addButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 8,
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
  searchingText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
  noResultsText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
});

export default AddLogScreen;