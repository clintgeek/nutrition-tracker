import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button, Title, Text, Card, Divider, useTheme, Searchbar, Avatar, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { foodService } from '../../services/foodService';
import { foodLogService } from '../../services/foodLogService';
import { getSourceIcon, getSourceColor } from '../../utils/foodUtils';

// Define the route params type
type RouteParams = {
  date?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
};

const AddLogScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;

  // Get date and meal type from route params
  const { date = new Date().toISOString().split('T')[0], mealType = 'snack' } = params || {};

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
        console.log('Search results:', results);
        if (results.foods) {
          setFoods(results.foods);
        }
      } catch (err) {
        console.error('Food search error:', err);
        setError('Failed to search for foods');
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchFoods, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelectFood = async (food) => {
    try {
      await foodLogService.createLog({
        food_item_id: food.id,
        log_date: date,
        meal_type: mealType,
        servings: parseFloat(servings),
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error adding food to log:', error);
      setError('Failed to add food to log');
    }
  };

  const renderFoodItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleSelectFood(item)}>
      <Card style={styles.foodCard}>
        <Card.Content style={styles.foodCardContent}>
          <Avatar.Icon
            size={40}
            icon={getSourceIcon(item.source)}
            style={{ backgroundColor: getSourceColor(item.source, theme) }}
            color="#fff"
          />
          <View style={styles.foodInfo}>
            <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
            {item.brand && <Text style={styles.brandText} numberOfLines={1}>{item.brand}</Text>}
            <Text style={styles.calories}>
              {Math.round(item.calories || 0)} calories
              {item.serving_size && item.serving_unit ? ` per ${item.serving_size} ${item.serving_unit}` : ''}
            </Text>
            <View style={styles.macroContainer}>
              <Text style={styles.macroText}>P: {Math.round(item.protein || 0)}g</Text>
              <Text style={styles.macroText}>C: {Math.round(item.carbs || 0)}g</Text>
              <Text style={styles.macroText}>F: {Math.round(item.fat || 0)}g</Text>
            </View>
          </View>
          <View style={styles.sourceTag}>
            <Chip size={20} style={{ backgroundColor: item.source === 'custom' ? '#e1f5fe' : '#f1f8e9' }}>
              {item.source || 'unknown'}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search foods..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching for foods...</Text>
        </View>
      ) : foods.length > 0 ? (
        <FlatList
          data={foods}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.foodList}
        />
      ) : searchQuery.trim() ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="food-apple" size={64} color={theme.colors.primary} />
          <Text style={styles.emptyText}>No foods found matching "{searchQuery}"</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="food-apple" size={64} color={theme.colors.primary} />
          <Text style={styles.emptyText}>Search for foods to add to your log</Text>
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
    elevation: 0,
  },
  foodList: {
    padding: 16,
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
  },
  foodInfo: {
    flex: 1,
    marginLeft: 16,
  },
  foodName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  calories: {
    fontSize: 14,
    marginTop: 4,
  },
  macroContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  macroText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  sourceTag: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    textAlign: 'center',
  },
});

export default AddLogScreen;