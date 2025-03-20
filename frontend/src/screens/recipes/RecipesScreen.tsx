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
import { useNavigation, useFocusEffect, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    searchContainer: {
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
      elevation: 0,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingVertical: 8,
      paddingBottom: 80, // Add padding for FAB
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recipeCard: {
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
    recipeInfo: {
      marginLeft: 72, // 48dp (icon size) + 16dp (margin) + 8dp (extra space)
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    recipeName: {
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
    nutritionGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
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
      bottom: 64,
    },
  });

  // Load recipes on mount and when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
      return () => {
        setFabOpen(false);
      };
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
          <Card.Content style={styles.cardContent}>
            <Avatar.Icon
              size={48}
              icon="book-open"
              style={[styles.sourceIcon, { backgroundColor: `${theme.colors.primary}20` }]}
              color={theme.colors.primary}
            />

            <View style={styles.recipeInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.servingInfo}>
                  {item.servings} servings
                </Text>
                <TouchableOpacity onPress={() => handleDeleteRecipe(item)}>
                  <Avatar.Icon
                    size={24}
                    icon="delete"
                    color={theme.colors.error}
                    style={styles.actionIcon}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.nutritionGrid}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{caloriesPerServing}</Text>
                  <Text style={styles.nutritionLabel}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{proteinPerServing}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{carbsPerServing}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{fatPerServing}g</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
            </View>
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

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
          <SkeletonCard style={{ width: '100%', marginBottom: 12 }} />
        </View>
      ) : filteredRecipes.length > 0 ? (
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
            onAction={() => navigation.navigate('RecipeDetail', { recipeId: 'new' })}
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

      {isFocused && (
        <Portal>
          <FAB
            icon="plus"
            label="New Recipe"
            onPress={() => navigation.navigate('RecipeDetail', { recipeId: 'new' })}
            visible={true}
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            color="white"
          />
        </Portal>
      )}
    </View>
  );
}