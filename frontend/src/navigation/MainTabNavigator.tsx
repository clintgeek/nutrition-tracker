import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Import screens and navigators
import HomeScreen from '../screens/HomeScreen';
import FoodStackNavigator from './FoodStackNavigator';
import LogStackNavigator from './LogStackNavigator';
import GoalsStackNavigator from './GoalsStackNavigator';
import CustomHeader from '../components/CustomHeader';

// Define the tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  LogStack: undefined;
  FoodStack: undefined;
  GoalsStack: undefined;
  Settings: undefined;
};

// Create the tab navigator
const Tab = createBottomTabNavigator();

// Main tab navigator component
const MainTabNavigator: React.FC = () => {
  const theme = useTheme();

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
          headerShown: true, // Show header for the Home screen
          header: () => <CustomHeader title="Nutrition Tracker" />
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
          tabBarLabel: 'Food',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="GoalsStack"
        component={GoalsStackNavigator}
        options={{
          tabBarLabel: 'Goals',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="flag" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
