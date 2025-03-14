import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import {
  Searchbar,
  FAB,
  Text,
  Card,
  Title,
  Divider,
  Avatar,
  useTheme,
  Button,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Recipe } from '../../types';
import { RecipeStackParamList } from '../../types/navigation';
import { recipeService } from '../../services/recipeService';
import EmptyState from '../../components/common/EmptyState';
import { formatNumber } from '../../utils/formatters';
import { SkeletonCard, LoadingOverlay } from '../../components/common';

type RecipesScreenNavigationProp = NativeStackNavigationProp<RecipeStackParamList>;

export function RecipesScreen() {
  const navigation = useNavigation<RecipesScreenNavigationProp>();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load recipes on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [])
  );

  // Filter recipes when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecipes(recipes);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = recipes.filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        (recipe.description && recipe.description.toLowerCase().includes(query))
      );
      setFilteredRecipes(filtered);
    }
  }, [searchQuery, recipes]);

  const loadRecipes = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await recipeService.getRecipes();

      // Sort recipes alphabetically
      const sortedRecipes = [...data].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

      setRecipes(sortedRecipes);
      setFilteredRecipes(sortedRecipes);
    } catch (err) {
      console.error('Error loading recipes:', err);
      Alert.alert('Error', 'Failed to load recipes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadRecipes(true);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate('RecipeDetail', { recipeId: recipe.id });
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setIsDeleteModalVisible(true);
  };

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return;

    try {
      setIsDeleting(true);
      await recipeService.deleteRecipe(recipeToDelete.id);

      // Refresh recipes after deletion
      await loadRecipes();
      setIsDeleteModalVisible(false);
      setRecipeToDelete(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      Alert.alert('Error', 'Failed to delete recipe. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => {
    const caloriesPerServing = Math.round(item.total_calories / item.servings);
    const proteinPerServing = Math.round(item.total_protein_grams / item.servings);
    const carbsPerServing = Math.round(item.total_carbs_grams / item.servings);
    const fatPerServing = Math.round(item.total_fat_grams / item.servings);

    return (
      <TouchableOpacity onPress={() => handleRecipePress(item)}>
        <Card style={styles.recipeCard}>
          <Card.Content style={styles.recipeCardContent}>
            <Avatar.Icon
              size={40}
              icon="book-open"
              style={{ backgroundColor: theme.colors.primary }}
              color="#fff"
            />
            <View style={styles.recipeInfo}>
              <Title style={styles.recipeName}>{item.name}</Title>
              {item.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              )}

              <View style={styles.macroContainer}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{caloriesPerServing}</Text>
                  <Text style={styles.macroLabel}>Calories</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{proteinPerServing}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{carbsPerServing}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{fatPerServing}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDeleteRecipe(item)}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
        <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
        <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search recipes..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />
      </View>

      {filteredRecipes.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          {filteredRecipes.map((item, index) => (
            <View key={item.id || index}>
              {renderRecipeItem({ item })}
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        >
          <EmptyState
            icon="book-open-page-variant"
            title="No Recipes Found"
            message={searchQuery ? "Try a different search term" : "Add your first recipe"}
            actionLabel="Create Recipe"
            onAction={() => navigation.navigate('CreateRecipe')}
          />
        </ScrollView>
      )}

      <Portal>
        <Dialog
          visible={isDeleteModalVisible}
          onDismiss={() => setIsDeleteModalVisible(false)}
        >
          <Dialog.Title>Delete Recipe</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{recipeToDelete?.name}"? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsDeleteModalVisible(false)}>Cancel</Button>
            <Button onPress={confirmDeleteRecipe} textColor={theme.colors.error}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <LoadingOverlay visible={isDeleting} message="Deleting recipe..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
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
    elevation: 0,
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
  recipeCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
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
    color: '#757575',
  },
  actionButton: {
    margin: 0,
    padding: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    minHeight: 400,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});