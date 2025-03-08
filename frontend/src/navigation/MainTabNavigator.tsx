import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import FoodScreen from '../screens/food/FoodScreen';
import LogScreen from '../screens/log/LogScreen';
import GoalScreen from '../screens/goal/GoalScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Define the tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  Food: undefined;
  Log: undefined;
  Goal: undefined;
  Settings: undefined;
};

// Create the tab navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

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
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Food"
        component={FoodScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="food-apple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Log"
        component={LogScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="notebook" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Goal"
        component={GoalScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;