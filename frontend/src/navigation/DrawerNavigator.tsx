import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, Text, Divider, Switch } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/core';
import { StackActions } from '@react-navigation/routers';

import { useAuth } from '../contexts/AuthContext';

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

  return (
    <DrawerContentScrollView {...props}>
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

      {/* Custom tab navigation items */}
      <DrawerItem
        label="Food Logs"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="food-apple" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Log')}
        activeTintColor={theme.colors.primary}
      />

      <DrawerItem
        label="Foods"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="food" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Food')}
        activeTintColor={theme.colors.primary}
      />

      <DrawerItem
        label="Recipes"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="book-open" color={color} size={size} />
        )}
        onPress={() => navigateToTab('Recipe')}
        activeTintColor={theme.colors.primary}
      />

      <DrawerItem
        label="Meal Planner"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="calendar" color={color} size={size} />
        )}
        onPress={() => navigateToTab('MealPlanner')}
        activeTintColor={theme.colors.primary}
      />

      {/* Nutrition and Weight Goals from the original DrawerItemList */}
      <DrawerItem
        label="Nutrition Goals"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="target" color={color} size={size} />
        )}
        onPress={() => navigation.navigate('NutritionGoals')}
        activeTintColor={theme.colors.primary}
      />

      <DrawerItem
        label="Weight Goals"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="scale-bathroom" color={color} size={size} />
        )}
        onPress={() => navigation.navigate('WeightGoals')}
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