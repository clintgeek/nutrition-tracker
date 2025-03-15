import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

// Import screens and navigators
import HomeScreen from '../screens/HomeScreen';
import FoodStackNavigator from './FoodStackNavigator';
import LogStackNavigator from './LogStackNavigator';
import RecipeStackNavigator from './RecipeStackNavigator';
import CustomHeader from '../components/CustomHeader';

// Define navigation types
type DrawerParamList = {
  MainTabs: undefined;
  NutritionGoals: undefined;
  WeightGoals: undefined;
};

type NavigationProp = DrawerNavigationProp<DrawerParamList>;

// Define the tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  LogStack: undefined;
  FoodStack: undefined;
  RecipeStack: undefined;
};

// Create the tab navigator
const Tab = createBottomTabNavigator();

// Main tab navigator component
const MainTabNavigator: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const renderHeader = (title: string) => {
    return (
      <CustomHeader
        title={title}
        leftComponent={
          <TouchableOpacity
            onPress={() => {
              if (navigation.openDrawer) {
                navigation.openDrawer();
              }
            }}
            style={{ padding: 8 }}
          >
            <MaterialCommunityIcons
              name="menu"
              size={24}
              color="white"
            />
          </TouchableOpacity>
        }
      />
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.disabled,
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false, // Hide the header in the tab navigator
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
          headerShown: true,
          header: () => renderHeader('FitnessGeek')
        }}
      />
      <Tab.Screen
        name="LogStack"
        component={LogStackNavigator}
        options={{
          tabBarLabel: 'Log',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="notebook" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="FoodStack"
        component={FoodStackNavigator}
        options={{
          tabBarLabel: 'Foods',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="RecipeStack"
        component={RecipeStackNavigator}
        options={{
          tabBarLabel: 'Recipes',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
