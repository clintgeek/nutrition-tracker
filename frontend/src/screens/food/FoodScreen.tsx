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
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

import { foodService, FoodItem } from '../../services/foodService';
import { Food, CreateFoodDTO } from '../../types/Food';
import EmptyState from '../../components/common/EmptyState';
import EditableTextInput from '../../components/common/EditableTextInput';

const mapFoodItemToFood = (item: FoodItem): Food => ({
  id: item.id.toString(),
  name: item.name,
  barcode: item.barcode,
  calories: item.calories_per_serving,
  protein: item.protein_grams,
  carbs: item.carbs_grams,
  fat: item.fat_grams,
  servingSize: parseFloat(item.serving_size),
  servingUnit: item.serving_unit,
  isCustom: item.source === 'custom',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const getSourceIcon = (source: string) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return 'leaf';  // Leaf icon for USDA (natural/government source)
    case 'openfoodfacts':
      return 'barcode-scan';  // Barcode icon for OpenFoodFacts (crowdsourced database)
    case 'custom':
      return 'pencil';  // Pencil icon for custom foods
    default:
      return 'food';  // Default food icon
  }
};

const getSourceColor = (source: string, theme: any) => {
  switch (source?.toLowerCase()) {
    case 'usda':
      return '#4CAF50';  // Green for USDA
    case 'openfoodfacts':
      return '#2196F3';  // Blue for OpenFoodFacts
    case 'custom':
      return theme.colors.primary;  // Theme primary color for custom
    default:
      return theme.colors.primary;
  }
};

const FoodScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [isFoodDetailsVisible, setIsFoodDetailsVisible] = useState(false);

  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const fetchFoods = async (refresh = false) => {
    try {
      setIsLoading(true);
      console.log('Fetching foods...');

      const results = await foodService.combinedSearch(searchQuery);
      console.log('Combined search results:', results);

      setFoods(results);
      setFilteredFoods(results);
    } catch (error) {
      console.error('Error fetching foods:', error);
      if (refresh) {
        setFoods([]);
        setFilteredFoods([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSearch = () => {
    fetchFoods();
  };

  const handleSaveFood = async () => {
    if (!selectedFood) return;

    try {
      const foodData: CreateFoodDTO = {
        name: selectedFood.name,
        calories_per_serving: selectedFood.calories || 0,
        protein_grams: selectedFood.protein || 0,
        carbs_grams: selectedFood.carbs || 0,
        fat_grams: selectedFood.fat || 0,
        serving_size: selectedFood.servingSize?.toString() || '100',
        serving_unit: selectedFood.servingUnit || 'g',
        barcode: selectedFood.barcode,
        brand: selectedFood.brand,
        source: 'custom',  // Always set source to custom for saved foods
        source_id: selectedFood.sourceId,
      };

      await foodService.createCustomFood(foodData);
      setIsFoodDetailsVisible(false);
      setSelectedFood(null);
      fetchFoods(true);
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
      await fetchFoods(true);
      setIsDeleteModalVisible(false);
      setFoodToDelete(null);
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Failed to delete food. Please try again.');
    }
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    const calories = typeof item.calories === 'number' ? Math.round(item.calories) : 0;
    const protein = typeof item.protein === 'number' ? Math.round(item.protein) : 0;
    const carbs = typeof item.carbs === 'number' ? Math.round(item.carbs) : 0;
    const fat = typeof item.fat === 'number' ? Math.round(item.fat) : 0;

    const sourceIcon = getSourceIcon(item.source);
    const sourceColor = getSourceColor(item.source, theme);

    return (
      <TouchableOpacity onPress={() => navigateToFoodDetails(item)}>
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
                  icon={sourceIcon}
                  size={60}
                  color="white"
                  style={{ backgroundColor: sourceColor }}
                />
              )}
            </View>

            <View style={styles.foodInfo}>
              <Title style={styles.foodName}>{item.name}</Title>
              {item.brand && <Paragraph style={styles.brandName}>{item.brand}</Paragraph>}

              <View style={styles.nutritionInfo}>
                <Text style={styles.calories}>{calories} kcal</Text>
                <Text style={styles.macros}>
                  P: {protein}g • C: {carbs}g • F: {fat}g
                </Text>
              </View>
            </View>

            <View style={styles.rightActions}>
              {(item.isCustom || item.source === 'custom') && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFood(item)}
                >
                  <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
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
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
          onSubmitEditing={handleSearch}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

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
          onRefresh={() => fetchFoods(true)}
          ItemSeparatorComponent={() => <Divider />}
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={navigateToAddFood}
        color="white"
      />

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
              <EditableTextInput
                label="Name"
                value={selectedFood?.name || ''}
                onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, name: text } : null)}
                style={styles.input}
              />
              {selectedFood?.brand && (
                <EditableTextInput
                  label="Brand"
                  value={selectedFood.brand}
                  onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, brand: text } : null)}
                  style={styles.input}
                />
              )}

              <View style={styles.nutritionDetails}>
                <EditableTextInput
                  label="Calories (kcal)"
                  value={selectedFood?.calories?.toString() || '0'}
                  onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, calories: parseFloat(text) || 0 } : null)}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <EditableTextInput
                  label="Protein (g)"
                  value={selectedFood?.protein?.toString() || '0'}
                  onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, protein: parseFloat(text) || 0 } : null)}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <EditableTextInput
                  label="Carbs (g)"
                  value={selectedFood?.carbs?.toString() || '0'}
                  onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, carbs: parseFloat(text) || 0 } : null)}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <EditableTextInput
                  label="Fat (g)"
                  value={selectedFood?.fat?.toString() || '0'}
                  onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, fat: parseFloat(text) || 0 } : null)}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <View style={styles.servingContainer}>
                  <EditableTextInput
                    label="Serving Size"
                    value={selectedFood?.servingSize?.toString() || '100'}
                    onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, servingSize: parseFloat(text) || 100 } : null)}
                    keyboardType="numeric"
                    style={[styles.input, styles.servingSizeInput]}
                  />
                  <EditableTextInput
                    label="Unit"
                    value={selectedFood?.servingUnit || 'g'}
                    onChangeText={(text) => setSelectedFood(prev => prev ? { ...prev, servingUnit: text } : null)}
                    style={[styles.input, styles.servingUnitInput]}
                  />
                </View>
              </View>
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
  searchButton: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  foodCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingRight: 16,
    minHeight: 80,
  },
  foodImageContainer: {
    marginRight: 16,
  },
  foodInfo: {
    flex: 1,
    marginRight: 80,
  },
  foodName: {
    fontSize: 16,
    marginBottom: 2,
    paddingRight: 8,
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
  rightActions: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    padding: 8,
  },
  sourceChip: {
    backgroundColor: '#E1F5FE',
    height: 24,
    marginBottom: 8,
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
  nutritionDetails: {
    marginTop: 8,
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