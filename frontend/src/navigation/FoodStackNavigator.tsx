import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

import FoodScreen from '../screens/food/FoodScreen';
import AddFoodScreen from '../screens/food/AddFoodScreen';
import FoodSearchScreen from '../screens/food/FoodSearchScreen';
import BarcodeScanner from '../screens/food/BarcodeScanner';
import { RecipeDetailScreen } from '../screens/recipes/RecipeDetailScreen';
import { SearchFoodForRecipeScreen } from '../screens/recipes/SearchFoodForRecipeScreen';
import CustomHeader from '../components/CustomHeader';
import { Food } from '../types/Food';
import { RootStackParamList } from './AppNavigator';

// Define the stack navigator param list
export type FoodStackParamList = {
  FoodList: {
    scannedFood?: Food;
    addToLog?: boolean;
    logDate?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servings?: number;
  };
  FoodDetails: { foodId: string };
  AddFood: undefined;
  FoodSearch: {
    searchQuery?: string;
    addToLog?: boolean;
    logDate?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servings?: number;
  };
  BarcodeScanner: undefined;
  RecipeDetail: { recipeId: number | 'new'; selectedIngredient?: Food };
  SearchFoodForRecipe: { recipeId: number | 'new' };
};

// Create the stack navigator
const Stack = createStackNavigator();

// Food stack navigator component
const FoodStackNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="FoodList"
        component={FoodScreen}
        options={{
          title: 'Foods',
          header: (props) => (
            <CustomHeader
              title="Foods"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{
          title: 'Add Food',
          header: (props) => (
            <CustomHeader
              title="Add Food"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="FoodSearch"
        component={FoodSearchScreen}
        options={({ route }) => {
          const params = route.params as FoodStackParamList['FoodSearch'];
          const isAddingToLog = params?.addToLog;

          return {
            title: isAddingToLog ? 'Add Food To Your Log' : 'Search Foods',
            header: (props) => (
              <CustomHeader
                title={isAddingToLog ? 'Add Food To Your Log' : 'Search Foods'}
                showBackButton={props.back !== undefined}
              />
            )
          };
        }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScanner}
        options={{
          title: 'Scan Barcode',
          header: (props) => (
            <CustomHeader
              title="Scan Barcode"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={({ route }) => ({
          title: route.params.recipeId === 'new' ? 'New Recipe' : 'Recipe Details',
          header: (props) => (
            <CustomHeader
              title={route.params.recipeId === 'new' ? 'New Recipe' : 'Recipe Details'}
              showBackButton={props.back !== undefined}
            />
          )
        })}
      />
      <Stack.Screen
        name="SearchFoodForRecipe"
        component={SearchFoodForRecipeScreen}
        options={{
          title: 'Add Ingredient',
          header: (props) => (
            <CustomHeader
              title="Add Ingredient"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
    </Stack.Navigator>
  );
};

export default FoodStackNavigator;