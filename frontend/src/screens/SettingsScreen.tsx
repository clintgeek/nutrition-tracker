import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  List,
  Switch,
  Divider,
  Text,
  Avatar,
  Button,
  Card,
  useTheme,
  Dialog,
  Portal,
  Paragraph,
  ActivityIndicator
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthContext } from '../contexts/AuthContext';
import { SyncContext } from '../contexts/SyncContext';
import { syncService } from '../services/syncService';

const SettingsScreen: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [syncOnCellular, setSyncOnCellular] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [syncDialogVisible, setSyncDialogVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user, logout } = useContext(AuthContext);
  const { pendingChanges, syncData } = useContext(SyncContext);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedDarkMode = await AsyncStorage.getItem('darkMode');
        const storedSyncOnCellular = await AsyncStorage.getItem('syncOnCellular');
        const storedNotifications = await AsyncStorage.getItem('notificationsEnabled');
        const storedLastSyncTime = await AsyncStorage.getItem('lastSyncTime');

        if (storedDarkMode !== null) setDarkMode(storedDarkMode === 'true');
        if (storedSyncOnCellular !== null) setSyncOnCellular(storedSyncOnCellular === 'true');
        if (storedNotifications !== null) setNotificationsEnabled(storedNotifications === 'true');
        if (storedLastSyncTime !== null) setLastSyncTime(storedLastSyncTime);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', value.toString());
    // Theme would be updated through a theme provider
  };

  const handleSyncOnCellularToggle = async (value: boolean) => {
    setSyncOnCellular(value);
    await AsyncStorage.setItem('syncOnCellular', value.toString());
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', value.toString());
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await syncData();
      const now = new Date().toISOString();
      setLastSyncTime(now);
      await AsyncStorage.setItem('lastSyncTime', now);
      setSyncDialogVisible(false);
    } catch (error) {
      console.error('Error syncing data:', error);
      Alert.alert('Sync Error', 'There was a problem syncing your data. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // Check for pending changes before logout
            if (pendingChanges > 0) {
              Alert.alert(
                'Unsaved Changes',
                `You have ${pendingChanges} unsaved changes. Sync now before logging out?`,
                [
                  {
                    text: 'Sync & Logout',
                    onPress: async () => {
                      await syncData();
                      logout();
                    }
                  },
                  {
                    text: 'Logout Anyway',
                    style: 'destructive',
                    onPress: () => logout()
                  },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            } else {
              logout();
            }
          }
        }
      ]
    );
  };

  const navigateToEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to allow access to your photos to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      // Here you would upload the image to your server
      // and update the user's profile picture
      Alert.alert('Success', 'Profile picture updated successfully!');
    }
  };

  const formatSyncTime = (timestamp: string | null) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <TouchableOpacity onPress={pickImage}>
          <View style={styles.profileHeader}>
            {user?.profilePicture ? (
              <Avatar.Image
                source={{ uri: user.profilePicture }}
                size={80}
                style={styles.profilePicture}
              />
            ) : (
              <Avatar.Icon
                icon="account"
                size={80}
                style={[styles.profilePicture, { backgroundColor: theme.colors.primary }]}
              />
            )}
            <View style={styles.cameraIconContainer}>
              <MaterialCommunityIcons name="camera" size={20} color="white" />
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>

          <Button
            mode="outlined"
            onPress={navigateToEditProfile}
            style={styles.editProfileButton}
          >
            Edit Profile
          </Button>
        </View>
      </Card>

      <List.Section>
        <List.Subheader>App Settings</List.Subheader>

        <List.Item
          title="Dark Mode"
          description="Enable dark theme"
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          right={props => <Switch value={darkMode} onValueChange={handleDarkModeToggle} />}
        />

        <Divider />

        <List.Item
          title="Notifications"
          description="Enable push notifications"
          left={props => <List.Icon {...props} icon="bell" />}
          right={props => <Switch value={notificationsEnabled} onValueChange={handleNotificationsToggle} />}
        />

        <Divider />

        <List.Item
          title="Sync on Cellular Data"
          description="Allow syncing when not on Wi-Fi"
          left={props => <List.Icon {...props} icon="cellphone-wireless" />}
          right={props => <Switch value={syncOnCellular} onValueChange={handleSyncOnCellularToggle} />}
        />

        <Divider />

        <List.Item
          title="Sync Data"
          description={`Last sync: ${formatSyncTime(lastSyncTime)}`}
          left={props => <List.Icon {...props} icon="sync" />}
          onPress={() => setSyncDialogVisible(true)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Account</List.Subheader>

        <List.Item
          title="Change Password"
          left={props => <List.Icon {...props} icon="lock-reset" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />

        <Divider />

        <List.Item
          title="Privacy Policy"
          left={props => <List.Icon {...props} icon="shield-account" />}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        />

        <Divider />

        <List.Item
          title="Terms of Service"
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={() => navigation.navigate('TermsOfService')}
        />

        <Divider />

        <List.Item
          title="About"
          description="Version 1.0.0"
          left={props => <List.Icon {...props} icon="information" />}
          onPress={() => navigation.navigate('About')}
        />

        <Divider />

        <List.Item
          title="Logout"
          titleStyle={{ color: theme.colors.error }}
          left={props => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={handleLogout}
        />
      </List.Section>

      <Portal>
        <Dialog visible={syncDialogVisible} onDismiss={() => setSyncDialogVisible(false)}>
          <Dialog.Title>Sync Data</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              {pendingChanges > 0
                ? `You have ${pendingChanges} pending changes to sync.`
                : 'Your data is up to date.'}
            </Paragraph>
            <Paragraph>
              Last sync: {formatSyncTime(lastSyncTime)}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSyncDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleManualSync}
              loading={isSyncing}
              disabled={isSyncing}
            >
              Sync Now
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  profileHeader: {
    position: 'relative',
  },
  profilePicture: {
    marginBottom: 8,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    color: '#757575',
    marginBottom: 16,
  },
  editProfileButton: {
    marginTop: 8,
  },
});

export default SettingsScreen;