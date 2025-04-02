import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

// Import screens and navigators
import HomeScreen from '../screens/HomeScreen';
import LogStackNavigator from './LogStackNavigator';
import FoodStackNavigator from './FoodStackNavigator';
import RecipeStackNavigator from './RecipeStackNavigator';
import CustomHeader from '../components/CustomHeader';
import { MealPlannerStackNavigator } from './MealPlannerStackNavigator';
import WeightGoalsScreen from '../screens/goals/WeightGoalsScreen';
import BloodPressureScreen from '../screens/BloodPressureScreen';
import FitnessScreen from '../screens/FitnessScreen';

// Define navigation types
type DrawerParamList = {
  MainTabs: undefined;
  NutritionGoals: undefined;
};

type NavigationProp = DrawerNavigationProp<DrawerParamList>;

// Define the tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  WeightGoals: undefined;
  BloodPressure: undefined;
  MealPlanner: undefined;
  Food: undefined;
  Recipe: undefined;
  Fitness: undefined;
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
        tabBarShowLabel: false, // Hide labels to show only icons
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
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
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="WeightGoals"
        component={WeightGoalsScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="scale-bathroom" color={color} size={size} />
          ),
          headerShown: true,
          header: () => renderHeader('Weight Goals'),
        }}
      />
      <Tab.Screen
        name="Fitness"
        component={FitnessScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="watch-variant" color={color} size={size} />
          ),
          headerShown: true,
          header: () => renderHeader('Fitness'),
        }}
      />
      <Tab.Screen
        name="BloodPressure"
        component={BloodPressureScreen}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="heart-pulse" color={color} size={size} />
          ),
          headerShown: true,
          header: () => renderHeader('Blood Pressure'),
        }}
      />
      <Tab.Screen
        name="MealPlanner"
        component={MealPlannerStackNavigator}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="calendar" color={color} size={size} />
          ),
        }}
      />

      {/* Hidden screens accessible only from the drawer */}
      <Tab.Screen
        name="Food"
        component={FoodStackNavigator}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen
        name="Recipe"
        component={RecipeStackNavigator}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
