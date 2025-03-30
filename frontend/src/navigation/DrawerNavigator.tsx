import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, Text, Divider, Switch } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/core';
import { StackActions } from '@react-navigation/routers';

import { useAuth } from '../contexts/AuthContext';

// Define drawer navigation type
type DrawerParamList = {
  MainTabs: undefined;
  NutritionGoals: undefined;
};

// Custom drawer content component
const DrawerContent = (props: any) => {
  const theme = useTheme();
  const { logout } = useAuth();
  const { state, navigation } = props;

  const handleLogout = async () => {
    await logout();
  };

  // Navigate to a specific tab in the MainTabs navigator
  const navigateToTab = (tabName: string) => {
    // First navigate to MainTabs if not already there
    navigation.navigate('MainTabs');

    // Then navigate to the specific tab
    navigation.navigate('MainTabs', { screen: tabName });
  };

  // Navigate to a stack screen within a tab
  const navigateToStackScreen = (tabName: string, stackScreen: string) => {
    navigation.navigate('MainTabs');
    navigation.navigate('MainTabs', {
      screen: tabName,
      params: { screen: stackScreen }
    });
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      <View style={[styles.drawerHeader, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="weight-lifter" size={32} color="white" />
          <Text style={styles.drawerHeaderText}>FitnessGeek</Text>
          <Text style={[styles.codeTag, { marginTop: 4 }]}>{"</>"}</Text>
        </View>
      </View>
      <Divider />

      {/* Home item */}
      <DrawerItem
        label="Home"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="home" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Home')}
        activeTintColor={theme.colors.primary}
      />

      {/* Food Logs */}
      <DrawerItem
        label="Food Logs"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="food-apple" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Log')}
        activeTintColor={theme.colors.primary}
      />

      {/* Weight Goals */}
      <DrawerItem
        label="Weight Logs"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="scale-bathroom" color={color} size={size} />
        )}
        onPress={() => navigateToTab('WeightGoals')}
        activeTintColor={theme.colors.primary}
      />

      {/* Blood Pressure */}
      <DrawerItem
        label="BP Logs"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="heart-pulse" color={color} size={size} />
        )}
        onPress={() => navigateToTab('BloodPressure')}
        activeTintColor={theme.colors.primary}
      />

      {/* Meal Planner */}
      <DrawerItem
        label="Meal Planner"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="calendar" color={color} size={size} />
        )}
        onPress={() => navigateToTab('MealPlanner')}
        activeTintColor={theme.colors.primary}
      />

      {/* Recipes */}
      <DrawerItem
        label="Recipes"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="book-open" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Recipe')}
        activeTintColor={theme.colors.primary}
      />

      {/* Foods */}
      <DrawerItem
        label="Food List"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="food" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Food')}
        activeTintColor={theme.colors.primary}
      />

      {/* Nutrition Goals */}
      <DrawerItem
        label="Nutrition Goals"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="target" color={color} size={size} />
        )}
        onPress={() => navigation.navigate('NutritionGoals')}
        activeTintColor={theme.colors.primary}
      />

      <Divider />

      <DrawerItem
        label="Logout"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="logout" color={color} size={size} />
        )}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  drawerHeaderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  codeTag: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
});

export default DrawerContent;