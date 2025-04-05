import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { Button, Card, Title, Paragraph, useTheme, Portal, Dialog, Switch, Divider, List, RadioButton } from 'react-native-paper';
import { format } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import Constants from 'expo-constants';

import { fitnessService, GarminConnectionStatus, SyncResult, GarminCredentials, SyncStatus, DevModeStatus } from '../services/fitnessService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Garmin Settings Screen
 * Allows users to connect/disconnect Garmin account and manage sync settings
 */
const GarminSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { token } = useAuth(); // Get auth token for debugging
  const [connectionStatus, setConnectionStatus] = useState<GarminConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentials, setCredentials] = useState<GarminCredentials>({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncLoading, setIsSyncLoading] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<number>(15);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApiEnabledInDev, setIsApiEnabledInDev] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  // Check if user is admin (has permissions to configure sync)
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Simple way to check admin status - you might need to implement a proper check
        const userId = await AsyncStorage.getItem('@NutritionTracker:userId');
        // Assuming user ID 1 is admin
        setIsAdmin(userId === '1');
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };
    checkAdminStatus();
  }, []);

  // Custom colors for Garmin screen (same as Fitness screen)
  const garminColors = {
    primary: '#1976D2',  // Darker blue
    lightBlue: '#64B5F6',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    placeholder: '#9E9E9E', // Grey
    text: '#333333',
    accent: '#E3F2FD',
    borderColor: '#E0E0E0',
    error: '#FF5252'  // Red for error states
  };

  // Fetch token from storage for debugging
  useEffect(() => {
    const getToken = async () => {
      try {
        const token = await AsyncStorage.getItem('@NutritionTracker:token');
        setAuthToken(token);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  // Fetch connection status when component mounts
  useEffect(() => {
    fetchConnectionStatus();
    fetchSyncStatus();
  }, []);

  // Check environment mode
  useEffect(() => {
    const env = Constants.expoConfig?.extra?.env || 'development';
    setIsDevMode(env === 'development');

    // If in dev mode, check the current API setting
    if (env === 'development') {
      checkApiEnabledStatus();
    }
  }, []);

  // Fetch Garmin connection status
  const fetchConnectionStatus = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching Garmin connection status...');
      const status = await fitnessService.checkGarminConnectionStatus();
      console.log('Connection status response:', status);
      setConnectionStatus(status);
    } catch (error) {
      console.error('Error fetching Garmin connection status:', error);
      Alert.alert('Error', 'Failed to fetch Garmin connection status');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch background sync status
  const fetchSyncStatus = async () => {
    setIsSyncLoading(true);
    try {
      const status = await fitnessService.getSyncStatus();
      setSyncStatus(status);
      setSelectedInterval(status.interval);
    } catch (error) {
      console.error('Error fetching sync status:', error);
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Toggle background sync
  const toggleBackgroundSync = async () => {
    if (!syncStatus) return;

    setIsSyncLoading(true);
    try {
      let result;
      if (syncStatus.active) {
        result = await fitnessService.stopBackgroundSync();
      } else {
        result = await fitnessService.startBackgroundSync(selectedInterval);
      }

      if (result.success) {
        // Refresh sync status
        await fetchSyncStatus();
      } else {
        Alert.alert('Error', result.error || 'Failed to update sync settings');
      }
    } catch (error) {
      console.error('Error toggling background sync:', error);
      Alert.alert('Error', 'Failed to update sync settings');
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Update sync interval
  const updateInterval = async () => {
    setIsSyncLoading(true);
    try {
      const result = await fitnessService.updateSyncInterval(selectedInterval);

      if (result.success) {
        // Refresh sync status
        await fetchSyncStatus();
        setShowSyncSettings(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to update sync interval');
      }
    } catch (error) {
      console.error('Error updating sync interval:', error);
      Alert.alert('Error', 'Failed to update sync interval');
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Trigger manual sync
  const triggerManualSync = async () => {
    setIsSyncLoading(true);
    try {
      const result = await fitnessService.triggerManualSync();

      if (result.success) {
        Alert.alert('Success', 'Manual sync triggered successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to trigger manual sync');
      }
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      Alert.alert('Error', 'Failed to trigger manual sync');
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Connect to Garmin account
  const connectToGarmin = async () => {
    // Show credentials modal
    setShowCredentialsModal(true);
  };

  // Submit credentials and connect
  const submitCredentials = async () => {
    if (!credentials.username || !credentials.password) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    setShowCredentialsModal(false);
    setIsConnecting(true);

    try {
      const result = await fitnessService.connectGarminAccount(credentials);
      if (result.success) {
        Alert.alert('Success', 'Garmin account connected successfully');

        // Clear credentials from state for security
        setCredentials({ username: '', password: '' });

        // Refresh connection status
        await fetchConnectionStatus();

        // Perform initial data sync for today
        try {
          const today = new Date();
          const todayStr = format(today, 'yyyy-MM-dd');

          Alert.alert(
            'Syncing Data',
            'Performing initial sync with Garmin. This might take a few moments...',
            [{ text: 'OK' }]
          );

          // Sync daily summary and activities for today only to minimize API usage
          console.log('Performing initial sync for today:', todayStr);
          await fitnessService.syncGarminDailySummaries(todayStr, todayStr);
          await fitnessService.importGarminActivities(todayStr, todayStr);

          // Navigate to the fitness screen to show the data
          navigation.navigate('Fitness' as never);
        } catch (syncError) {
          console.error('Error during initial sync:', syncError);
          // Don't show error to user, they can still use the Sync button on the Fitness screen
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to connect to Garmin');
      }
    } catch (error) {
      console.error('Error connecting to Garmin:', error);
      Alert.alert('Error', 'Failed to connect to Garmin');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from Garmin account
  const disconnectFromGarmin = async () => {
    Alert.alert(
      'Confirm Disconnect',
      'Are you sure you want to disconnect your Garmin account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsConnecting(true);
            try {
              console.log('Disconnecting Garmin account...');
              const result = await fitnessService.disconnectGarminAccount();
              console.log('Disconnect result:', result);

              if (result.success) {
                Alert.alert('Success', 'Garmin account disconnected successfully');
                // Refresh connection status after disconnect
                console.log('Refreshing connection status...');

                // Force a small delay before refreshing to ensure backend has updated
                setTimeout(async () => {
                  try {
                    console.log('Fetching fresh status after disconnect');
                    // Bypass the service method and make the direct API call with timestamp
                    const timestamp = new Date().getTime();
                    const freshResponse = await api.get(`/fitness/garmin/status?_=${timestamp}`);
                    console.log('Fresh status after disconnect:', freshResponse.data);
                    setConnectionStatus(freshResponse.data);
                  } catch (err) {
                    console.error('Error fetching fresh status:', err);
                    await fetchConnectionStatus(); // Fallback to regular method
                  }
                }, 500);

              } else {
                console.error('Disconnect error:', result.error);
                Alert.alert('Error', result.error || 'Failed to disconnect from Garmin');
              }
            } catch (error) {
              console.error('Error disconnecting from Garmin:', error);
              Alert.alert('Error', 'Failed to disconnect from Garmin');
            } finally {
              setIsConnecting(false);
            }
          },
        },
      ]
    );
  };

  // Handle credentials change
  const handleCredentialsChange = (key: keyof GarminCredentials, value: string): void => {
    setCredentials({
      ...credentials,
      [key]: value
    });
  };

  // Test Garmin connection
  const testGarminConnection = async () => {
    setIsConnecting(true);
    try {
      const result = await fitnessService.testGarminConnection();
      if (result.success) {
        Alert.alert(
          'Connection Test Successful',
          `Successfully connected to Garmin! ${result.message || ''}`,
          [
            {
              text: 'OK',
              onPress: () => console.log('Test successful'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Connection Test Failed',
          `Failed to connect to Garmin: ${result.error || 'Unknown error'}`,
          [
            {
              text: 'OK',
              onPress: () => console.log('Test failed'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error testing Garmin connection:', error);
      Alert.alert('Error', 'Failed to test Garmin connection');
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if Garmin API is enabled in dev mode
  const checkApiEnabledStatus = async () => {
    try {
      const status = await fitnessService.getDevModeStatus();
      setIsApiEnabledInDev(status.enabled || false);
    } catch (error) {
      console.error('Error checking API enabled status:', error);
      setIsApiEnabledInDev(false);
    }
  };

  // Toggle Garmin API in dev mode
  const toggleApiInDevMode = async () => {
    try {
      setIsSyncLoading(true);
      const newState = !isApiEnabledInDev;
      const response = await fitnessService.toggleDevModeApiAccess(newState);

      if (response.success) {
        setIsApiEnabledInDev(newState);
        Alert.alert(
          'Development Mode Setting',
          `Garmin API calls are now ${newState ? 'enabled' : 'disabled'} in development mode. ${
            newState
              ? 'Live API will be used for real-time data.'
              : 'Database data will be shown (no live API calls). If no data exists in the database, empty results will be shown.'
          }`
        );
      } else {
        Alert.alert('Error', 'Failed to update development mode setting');
      }
    } catch (error) {
      console.error('Error toggling API in dev mode:', error);
      Alert.alert('Error', 'Failed to update development mode setting');
    } finally {
      setIsSyncLoading(false);
    }
  };

  // Render credentials modal
  const renderCredentialsModal = () => {
    return (
      <Portal>
        <Dialog
          visible={showCredentialsModal}
          onDismiss={() => setShowCredentialsModal(false)}
          style={styles(theme, garminColors).modalContainer}
        >
          <Dialog.Title>Garmin Connect Credentials</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles(theme, garminColors).modalDescription}>
              Enter your Garmin Connect credentials to link your account.
              Your credentials are securely stored and only used to access your Garmin Connect data.
            </Paragraph>
            <View style={styles(theme, garminColors).inputWrapper}>
              <Text style={styles(theme, garminColors).inputLabel}>Username</Text>
              <RNTextInput
                value={credentials.username}
                onChangeText={(value: string) => handleCredentialsChange('username', value)}
                style={styles(theme, garminColors).textInput}
                autoCapitalize="none"
                placeholder="Your Garmin Connect username"
              />
            </View>
            <View style={styles(theme, garminColors).inputWrapper}>
              <Text style={styles(theme, garminColors).inputLabel}>Password</Text>
              <RNTextInput
                value={credentials.password}
                onChangeText={(value: string) => handleCredentialsChange('password', value)}
                secureTextEntry
                style={styles(theme, garminColors).textInput}
                placeholder="Your Garmin Connect password"
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCredentialsModal(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={submitCredentials}
              color={garminColors.primary}
            >
              Connect
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  // Render sync settings section
  const renderSyncSettings = () => {
    if (!isAdmin) return null;

    return (
      <Card style={styles(theme, garminColors).card}>
        <Card.Content>
          <Title style={styles(theme, garminColors).title}>Background Sync Settings</Title>

          {isSyncLoading ? (
            <ActivityIndicator size="small" color={garminColors.primary} style={{ marginVertical: 16 }} />
          ) : syncStatus ? (
            <>
              <View style={styles(theme, garminColors).settingRow}>
                <Text style={styles(theme, garminColors).settingLabel}>Auto Sync</Text>
                <Switch
                  value={syncStatus.active}
                  onValueChange={toggleBackgroundSync}
                  color={garminColors.primary}
                  disabled={isSyncLoading}
                />
              </View>

              <Divider style={styles(theme, garminColors).divider} />

              <View style={styles(theme, garminColors).settingRow}>
                <Text style={styles(theme, garminColors).settingLabel}>Sync Interval</Text>
                <TouchableOpacity
                  onPress={() => setShowSyncSettings(true)}
                  style={styles(theme, garminColors).intervalButton}
                >
                  <Text style={styles(theme, garminColors).intervalText}>
                    {syncStatus.interval} minutes
                  </Text>
                </TouchableOpacity>
              </View>

              <Divider style={styles(theme, garminColors).divider} />

              <View style={styles(theme, garminColors).settingRow}>
                <Text style={styles(theme, garminColors).settingLabel}>Status</Text>
                <Text style={[
                  styles(theme, garminColors).statusText,
                  { color: syncStatus.active ? '#4CAF50' : garminColors.placeholder }
                ]}>
                  {syncStatus.active ? 'Active' : 'Inactive'}
                </Text>
              </View>

              <Divider style={styles(theme, garminColors).divider} />

              <Button
                mode="contained"
                onPress={triggerManualSync}
                style={styles(theme, garminColors).syncButton}
                disabled={isSyncLoading}
              >
                Sync Now
              </Button>
            </>
          ) : (
            <Text style={styles(theme, garminColors).noDataText}>
              Could not retrieve sync status
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  // Render sync settings modal
  const renderSyncSettingsModal = () => {
    return (
      <Portal>
        <Dialog
          visible={showSyncSettings}
          onDismiss={() => setShowSyncSettings(false)}
          style={styles(theme, garminColors).modalContainer}
        >
          <Dialog.Title>Sync Interval</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles(theme, garminColors).modalDescription}>
              Select how often the system should automatically sync Garmin data.
            </Paragraph>
            <RadioButton.Group
              onValueChange={(value: string) => setSelectedInterval(Number(value))}
              value={selectedInterval.toString()}
            >
              <RadioButton.Item
                label="Every 10 minutes"
                value="10"
                style={styles(theme, garminColors).radioItem}
              />
              <RadioButton.Item
                label="Every 15 minutes"
                value="15"
                style={styles(theme, garminColors).radioItem}
              />
              <RadioButton.Item
                label="Every 30 minutes"
                value="30"
                style={styles(theme, garminColors).radioItem}
              />
              <RadioButton.Item
                label="Every hour"
                value="60"
                style={styles(theme, garminColors).radioItem}
              />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSyncSettings(false)}>Cancel</Button>
            <Button onPress={updateInterval}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  // Development mode settings section
  const DevModeSettings = () => {
    if (isDevMode) {
      return (
        <View style={styles(theme, garminColors).settingsGroup}>
          <Title style={styles(theme, garminColors).sectionTitle}>Development Mode Settings</Title>
          <Card style={styles(theme, garminColors).card}>
            <Card.Content>
              <View style={styles(theme, garminColors).settingRow}>
                <View style={styles(theme, garminColors).settingInfo}>
                  <Text style={styles(theme, garminColors).settingLabel}>Garmin API Calls</Text>
                  <Text style={styles(theme, garminColors).settingDescription}>
                    {isApiEnabledInDev ?
                      'Enabled: Live API calls will be made to Garmin.' :
                      'Disabled: Only database data will be shown. If no data exists in the database, no data will be displayed.'}
                  </Text>
                </View>
                <Switch
                  value={isApiEnabledInDev}
                  onValueChange={toggleApiInDevMode}
                  color={theme.colors.primary}
                />
              </View>
            </Card.Content>
          </Card>
        </View>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles(theme, garminColors).loadingContainer}>
        <ActivityIndicator size="large" color={garminColors.primary} />
        <Text style={{ marginTop: 16, color: garminColors.text }}>Loading Garmin connection status...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles(theme, garminColors).container}>
      <View style={styles(theme, garminColors).contentContainer}>
        <Text style={styles(theme, garminColors).title}>Garmin Integration</Text>

        {/* Debug authentication status */}
        <Card style={styles(theme, garminColors).card}>
          <Card.Content>
            <Title style={{ color: garminColors.text }}>Auth Status (Debug)</Title>
            <Paragraph style={{ color: garminColors.text }}>Context Token: {token ? 'Present' : 'Missing'}</Paragraph>
            <Paragraph style={{ color: garminColors.text }}>Storage Token: {authToken ? 'Present' : 'Missing'}</Paragraph>
            <Paragraph style={{ color: garminColors.text }}>Token Value: {authToken ? `${authToken.substring(0, 10)}...` : 'None'}</Paragraph>
          </Card.Content>
        </Card>

        {connectionStatus && connectionStatus.connected ? (
          <>
            <View style={styles(theme, garminColors).connectedContainer}>
              <Text style={styles(theme, garminColors).connectedText}>
                Connected to Garmin Connect
              </Text>
              {connectionStatus.lastSyncTime && (
                <Text style={styles(theme, garminColors).lastSyncText}>
                  Last synced: {format(new Date(connectionStatus.lastSyncTime), 'MMM d, yyyy h:mm a')}
                </Text>
              )}
            </View>

            <View style={styles(theme, garminColors).actionsContainer}>
              <Button
                mode="outlined"
                onPress={disconnectFromGarmin}
                style={[styles(theme, garminColors).button, styles(theme, garminColors).disconnectButton]}
                disabled={isConnecting}
              >
                Disconnect
              </Button>

              <Button
                mode="contained"
                onPress={testGarminConnection}
                style={styles(theme, garminColors).button}
                disabled={isConnecting}
              >
                Test Connection
              </Button>
            </View>
          </>
        ) : (
          <>
            <Paragraph style={styles(theme, garminColors).description}>
              Connect your Garmin account to sync your fitness data with the app.
            </Paragraph>

            <Button
              mode="contained"
              onPress={connectToGarmin}
              style={styles(theme, garminColors).connectButton}
              disabled={isConnecting}
            >
              Connect Garmin Account
            </Button>
          </>
        )}

        {connectionStatus && connectionStatus.connected && renderSyncSettings()}

        {renderCredentialsModal()}
        {renderSyncSettingsModal()}

        <DevModeSettings />
      </View>
    </ScrollView>
  );
};

const styles = (theme: any, colors?: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors?.background || (theme.dark ? theme.colors.background : '#f5f5f5'),
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors?.primary || '#2196F3',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: colors?.surface || theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors?.borderColor || 'transparent',
  },
  actionButton: {
    marginTop: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  label: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
    color: colors?.text || '#212121',
  },
  modalContainer: {
    backgroundColor: colors?.surface || 'white',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 12,
    color: colors?.text || theme.colors.text,
  },
  modalDescription: {
    marginBottom: 16,
    color: colors?.placeholder || '#666',
  },
  textInput: {
    marginBottom: 16,
    backgroundColor: colors?.surface || theme.colors.surface,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors?.placeholder || '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  successText: {
    color: 'green',
  },
  errorText: {
    color: colors?.error || 'red',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: colors?.text || '#212121',
  },
  connectedContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingVertical: 16,
    backgroundColor: colors?.accent,
    borderRadius: 8,
  },
  connectedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors?.primary,
  },
  lastSyncText: {
    marginTop: 8,
    color: colors?.placeholder,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  disconnectButton: {
    borderColor: colors?.error,
    borderWidth: 1,
  },
  disconnectButtonLabel: {
    color: colors?.error,
  },
  connectButton: {
    backgroundColor: colors?.primary,
    marginTop: 8,
  },
  description: {
    marginBottom: 16,
    color: colors?.text,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: colors?.text,
  },
  divider: {
    backgroundColor: colors?.borderColor,
  },
  intervalButton: {
    backgroundColor: colors?.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  intervalText: {
    color: colors?.primary,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  syncButton: {
    marginTop: 16,
    backgroundColor: colors?.primary,
  },
  noDataText: {
    textAlign: 'center',
    color: colors?.placeholder,
    marginVertical: 16,
  },
  radioItem: {
    paddingVertical: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors?.text || theme.colors.text,
  },
  settingText: {
    fontSize: 16,
    color: colors?.text || theme.colors.text,
  },
  helpText: {
    marginTop: 8,
    color: colors?.placeholder || '#666',
  },
  settingsGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors?.text || theme.colors.text,
  },
  settingInfo: {
    flexDirection: 'column',
  },
  settingDescription: {
    marginTop: 4,
    color: colors?.placeholder || '#666',
  },
});

export default GarminSettingsScreen;