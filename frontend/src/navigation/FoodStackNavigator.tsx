import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/routers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

  // Function to render header with hamburger menu
  const renderHeaderWithMenu = (title: string, showBack: boolean = false) => {
    return (props: any) => {
      const navigation = useNavigation();

      const MenuButton = () => (
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={{ marginLeft: 10 }}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      );

      return (
        <CustomHeader
          title={title}
          showBackButton={showBack || props.back !== undefined}
          leftComponent={!showBack && !props.back ? <MenuButton /> : undefined}
        />
      );
    };
  };

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
          header: renderHeaderWithMenu('Foods')
        }}
      />
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{
          title: 'Add Food',
          header: renderHeaderWithMenu('Add Food', true)
        }}
      />
      <Stack.Screen
        name="FoodSearch"
        component={FoodSearchScreen}
        options={({ route }) => {
          const params = route.params as FoodStackParamList['FoodSearch'];
          const isAddingToLog = params?.addToLog;
          const title = isAddingToLog ? 'Add Food To Your Log' : 'Search Foods';

          return {
            title,
            header: renderHeaderWithMenu(title, true)
          };
        }}
      />
      <Stack.Screen
        name="BarcodeScanner"
        component={BarcodeScanner}
        options={{
          title: 'Scan Barcode',
          header: renderHeaderWithMenu('Scan Barcode', true)
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={({ route }) => {
          const title = route.params.recipeId === 'new' ? 'New Recipe' : 'Recipe Details';
          return {
            title,
            header: renderHeaderWithMenu(title, true)
          };
        }}
      />
      <Stack.Screen
        name="SearchFoodForRecipe"
        component={SearchFoodForRecipeScreen}
        options={{
          title: 'Add Ingredient',
          header: renderHeaderWithMenu('Add Ingredient', true)
        }}
      />
    </Stack.Navigator>
  );
};

export default FoodStackNavigator;