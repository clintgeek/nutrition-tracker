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

  const handleLogout = async () => {
    await logout();
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
      <DrawerItemList {...props} />
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