import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/routers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
        name="Recipes"
        component={RecipesScreen}
        options={{
          title: 'Recipes',
          header: renderHeaderWithMenu('Recipes')
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

export default RecipeStackNavigator;