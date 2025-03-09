import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
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
  Button
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

import { foodService } from '../../services/foodService';
import { Food, FoodSearchParams, FoodSearchResult } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';

const FoodScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'calories'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [includeCustom, setIncludeCustom] = useState(true);

  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const fetchFoods = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
        setPage(1);
      } else {
        setIsLoading(true);
      }

      console.log('Fetching foods with query:', searchQuery);

      const result = await foodService.searchFood(searchQuery, refresh ? 1 : page, 20);
      console.log('Search result:', result);

      const mappedFoods = result.foods.map(item => ({
        id: item.id.toString(),
        name: item.name,
        calories: item.calories_per_serving,
        protein: item.protein_grams,
        carbs: item.carbs_grams,
        fat: item.fat_grams,
        servingSize: parseFloat(item.serving_size),
        servingUnit: item.serving_unit,
        isCustom: item.source === 'custom',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      console.log('Mapped foods count:', mappedFoods.length);

      if (refresh || page === 1) {
        setFoods(mappedFoods);
      } else {
        setFoods([...foods, ...mappedFoods]);
      }

      setTotalPages(1);
    } catch (error) {
      console.error('Error fetching foods:', error);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 500) {
          console.error('Server error. The backend might be down or misconfigured.');
        } else if (!error.response) {
          console.error('Network error. Check your connection or backend server status.');
        }
      }

      if (refresh) {
        setFoods([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFoods(true);
    }, [searchQuery, sortBy, sortOrder, includeCustom])
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoading) {
      setPage(page + 1);
      fetchFoods();
    }
  };

  const handleRefresh = () => {
    fetchFoods(true);
  };

  const navigateToFoodDetails = (foodId: string) => {
    navigation.navigate('FoodDetails', { foodId });
  };

  const navigateToAddFood = () => {
    navigation.navigate('AddFood');
  };

  const navigateToScanBarcode = () => {
    navigation.navigate('BarcodeScanner');
  };

  const navigateToFoodSearch = () => {
    console.log('Navigating to FoodSearch screen');
    navigation.navigate('FoodSearch');
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    return (
      <TouchableOpacity onPress={() => navigateToFoodDetails(item.id)}>
        <Card style={styles.foodCard}>
          <Card.Content style={styles.foodCardContent}>
            <View style={styles.foodImageContainer}>
              {item.imageUrl ? (
                <Avatar.Image
                  source={{ uri: item.imageUrl }}
                  size={60}
                />
              ) : (
                <Avatar.Icon
                  icon="food"
                  size={60}
                  color="white"
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
            </View>

            <View style={styles.foodInfo}>
              <Title style={styles.foodName}>{item.name}</Title>
              {item.brand && <Paragraph style={styles.brandName}>{item.brand}</Paragraph>}

              <View style={styles.nutritionInfo}>
                <Text style={styles.calories}>{Math.round(item.calories)} kcal</Text>
                <Text style={styles.macros}>
                  P: {Math.round(item.protein)}g • C: {Math.round(item.carbs)}g • F: {Math.round(item.fat)}g
                </Text>
              </View>

              {item.isCustom && (
                <Chip
                  style={styles.customChip}
                  textStyle={{ fontSize: 10 }}
                >
                  Custom
                </Chip>
              )}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isLoading) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search foods..."
          onChangeText={handleSearch}
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

      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={navigateToFoodSearch}
          icon={({ size, color }) => (
            <MaterialCommunityIcons name="database-search" size={size} color={color} />
          )}
          style={styles.actionButton}
        >
          Search Food Database
        </Button>
      </View>

      {isLoading && foods.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading foods...</Text>
        </View>
      ) : foods.length === 0 ? (
        <EmptyState
          icon="food"
          title="No foods found"
          message={searchQuery ? `No foods matching "${searchQuery}"` : "Add foods to your database"}
          actionLabel="Add Food"
          onAction={navigateToAddFood}
        />
      ) : (
        <FlatList
          data={foods}
          renderItem={renderFoodItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.foodList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
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
    backgroundColor: 'white',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  scanButton: {
    marginLeft: 12,
    padding: 8,
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
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  foodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodImageContainer: {
    marginRight: 16,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    marginBottom: 2,
  },
  brandName: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  nutritionInfo: {
    marginTop: 4,
  },
  calories: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  macros: {
    fontSize: 12,
    color: '#757575',
  },
  customChip: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E1F5FE',
    height: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  footerLoader: {
    marginVertical: 16,
    alignItems: 'center',
  },
  actionsContainer: {
    padding: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButton: {
    marginVertical: 4,
  },
});

export default FoodScreen;