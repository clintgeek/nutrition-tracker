import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, Text, Divider } from 'react-native-paper';

import { useAuth } from '../contexts/AuthContext';

// Custom drawer content component
const DrawerContent = (props: any) => {
  const theme = useTheme();
  const { logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            await logout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={[styles.drawerHeader, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="weight-lifter" size={32} color="white" />
          <Text style={styles.drawerHeaderText}>FitnessGeek</Text>
          <MaterialCommunityIcons name="code-tags" size={28} color="white" style={{ marginTop: 4 }} />
        </View>
      </View>
      <Divider />
      <DrawerItem
        label="Home"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="home" color={color} size={size} />
        )}
        onPress={() => props.navigation.navigate('MainTabs')}
      />
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
});

export default DrawerContent;