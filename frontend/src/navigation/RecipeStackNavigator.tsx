import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

import { RecipesScreen } from '../screens/recipes/RecipesScreen';
import { RecipeDetailScreen } from '../screens/recipes/RecipeDetailScreen';
import { SearchFoodForRecipeScreen } from '../screens/recipes/SearchFoodForRecipeScreen';
import CustomHeader from '../components/CustomHeader';
import { RecipeStackParamList } from '../types/navigation';

// Create the stack navigator
const Stack = createStackNavigator();

// Recipe stack navigator component
const RecipeStackNavigator: React.FC = () => {
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
        name="Recipes"
        component={RecipesScreen}
        options={{
          title: 'Recipes',
          header: (props) => (
            <CustomHeader
              title="Recipes"
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

export default RecipeStackNavigator;