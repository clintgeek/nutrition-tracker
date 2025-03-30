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
import { MealPlannerStackNavigator } from './MealPlannerStackNavigator';
import WeightGoalsScreen from '../screens/goals/WeightGoalsScreen';
import BloodPressureScreen from '../screens/BloodPressureScreen';

// Define navigation types
type DrawerParamList = {
  MainTabs: undefined;
  NutritionGoals: undefined;
  WeightGoals: undefined;
  BloodPressure: undefined;
};

type NavigationProp = DrawerNavigationProp<DrawerParamList>;

// Define the tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  Food: undefined;
  Recipe: undefined;
  MealPlanner: undefined;
  WeightGoals: undefined;
  BloodPressure: undefined;
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
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
          headerShown: true,
          header: () => renderHeader('FitnessGeek'),
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogStackNavigator}
        options={{
          tabBarLabel: 'Logs',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodStackNavigator}
        options={{
          tabBarLabel: 'Foods',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="food" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Recipe"
        component={RecipeStackNavigator}
        options={{
          tabBarLabel: 'Recipes',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="book-open" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MealPlanner"
        component={MealPlannerStackNavigator}
        options={{
          tabBarLabel: 'Planner',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />

      {/* Hidden screens that show the tab bar but aren't in the tab bar */}
      <Tab.Screen
        name="WeightGoals"
        component={WeightGoalsScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          headerShown: true,
          header: () => renderHeader('Weight Goals'),
        }}
      />
      <Tab.Screen
        name="BloodPressure"
        component={BloodPressureScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
          headerShown: true,
          header: () => renderHeader('Blood Pressure'),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
