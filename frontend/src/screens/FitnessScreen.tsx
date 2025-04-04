import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, ActivityIndicator, useTheme, Divider, Button } from 'react-native-paper';
import { format, parseISO, isToday, isYesterday, differenceInSeconds, addHours } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { fitnessService, GarminDailySummary, GarminConnectionStatus, RefreshedSummaryResult } from '../services/fitnessService';
import { api } from '../services/api';
import { getTodayDate } from '../utils/dateUtils';

/**
 * Fitness Screen
 * Shows Garmin Connect integration data
 */
const FitnessScreen: React.FC = () => {
  const [dailySummary, setDailySummary] = useState<GarminDailySummary | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GarminConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<any | null>(null);
  const theme = useTheme();
  const navigation = useNavigation();

  // Custom colors for fitness screen
  const fitnessColors = {
    primary: '#4285F4',
    lightBlue: '#B8D0FF',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    placeholder: '#9E9E9E',
    text: '#424242',
    accent: '#F1F1F1',
    borderColor: '#E0E0E0',
    error: '#DB4437',
    // Activity level colors
    highActivity: '#FF5722',   // Intense orange
    modActivity: '#FFC107',    // Medium yellow
    lowActivity: '#8BC34A',    // Light green
    sedentary: '#E0E0E0',      // Light gray
  };

  // Refactored Load data function (called by focus and pull-to-refresh)
  const loadData = useCallback(async (isPullRefresh = false) => {
    console.log('[FitnessScreen] loadData triggered', { isPullRefresh });
    if (!isPullRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setFetchError(null); // Clear previous errors

    try {
      const status = await fitnessService.checkGarminConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        const todayStr = getTodayDate();
        console.log(`[FitnessScreen] Fetching summary for ${todayStr} using getRefreshedGarminSummary`);
        const result: RefreshedSummaryResult = await fitnessService.getRefreshedGarminSummary(todayStr);

        console.log('[FitnessScreen] Summary Result:', result);
        setDailySummary(result.summary);
        setFetchError(result.error);

        // We no longer need specific rate limit state, just use the error
        if (result.error) {
            console.warn('[FitnessScreen] Error received from getRefreshedGarminSummary:', result.error);
        }

      } else {
        // Not connected, clear summary and error
        setDailySummary(null);
        setFetchError(null);
      }
    } catch (error) {
      console.error('[FitnessScreen] Unexpected error in loadData:', error);
      setFetchError({ message: 'An unexpected error occurred while loading data.' }); // Set a generic error
      setDailySummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // Empty dependency array for useCallback, relies on component scope

  // Load data on initial mount and focus
  useFocusEffect(
    useCallback(() => {
      console.log('FitnessScreen focused, calling loadData...');
      loadData(); // Call loadData on focus

      // No cleanup needed for timers anymore
      return () => {
        console.log('FitnessScreen unfocused');
      };
    }, [loadData]) // Depend on loadData callback
  );

  // Debug Garmin integration
  const debugGarminIntegration = async () => {
    try {
      console.log('Running Garmin debug diagnostics...');
      const response = await api.get('/fitness/garmin/debug');

      const data = response.data;
      const connectionStatus = data.connection_status || {};
      const pythonEnv = data.python_environment || {};

      // Create a more compact debug message
      const debugMessage = [
        '=== Connection ===',
        `Connected: ${connectionStatus.connected ? 'Yes' : 'No'}`,
        `Active: ${connectionStatus.isActive ? 'Yes' : 'No'}`,
        `Last Sync: ${connectionStatus.lastSyncTime ? new Date(connectionStatus.lastSyncTime).toLocaleString() : 'Never'}`,
        '',
        '=== Rate Limits ===',
        'Garmin API limits to ~15 requests/hour',
        'Each sync uses 2-3 requests',
        '',
        '=== Database Tables ===',
        ...(data.database_tables || []).map((table: {table_name: string, row_count: number}) =>
          `${table.table_name}: ${table.row_count} rows`
        )
      ].join('\n');

      Alert.alert(
        'Garmin Debug Info',
        debugMessage,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error running debug:', error);
      Alert.alert('Debug Error', String(error));
    }
  };

  // Updated function for manual force refresh button
  const handleManualForceRefresh = async () => {
      console.log('[FitnessScreen] Manual force refresh triggered');
      setForceRefreshing(true);
      setFetchError(null); // Clear previous errors

      try {
        const status = await fitnessService.checkGarminConnectionStatus();
        setConnectionStatus(status);

        if (status.connected) {
           const todayStr = getTodayDate();
           console.log(`[FitnessScreen] Force refreshing summary for ${todayStr} using forceRefreshGarminSummary`);
           // Call the NEW public service method
           const result = await fitnessService.forceRefreshGarminSummary(todayStr);

           console.log('[FitnessScreen] Manual Force Refresh Result:', result);

           // Update state based on the result object
           setDailySummary(result.summary);
           setFetchError(result.error);

           if (result.error) {
               console.warn('[FitnessScreen] Error during manual force refresh:', result.error);
           } else {
                // Successfully refreshed
                console.log('[FitnessScreen] Manual force refresh successful.');
           }
        } else {
             setDailySummary(null);
             setFetchError({ message: 'Cannot refresh, Garmin not connected.' });
        }
      } catch (error) {
          console.error('[FitnessScreen] Unexpected error during manual force refresh:', error);
          setFetchError({ message: 'An unexpected error occurred during force refresh.' });
          setDailySummary(null);
      } finally {
          setForceRefreshing(false);
      }
  };

  // Handle pull-to-refresh
  const onRefresh = () => {
    // Pass true to indicate it's a pull-to-refresh action
    loadData(true);
  };

  // Handle force refresh button press
  const onForceRefreshPress = () => {
    Alert.alert(
      'Force Refresh from Garmin',
      'This will bypass local cache check and get fresh data directly from Garmin API. This counts against the API rate limits. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: () => {
            console.log('[FitnessScreen] Alert "Refresh" button pressed. Attempting to call handleManualForceRefresh...');
            handleManualForceRefresh();
          }
        }
      ]
    );
  };

  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format distance from meters
  const formatDistance = (meters: number): string => {
    // Convert meters to miles (1 meter = 0.000621371 miles)
    const miles = meters * 0.000621371;
    return miles.toFixed(1) + ' mi';
  };

  // Format active time in minutes
  const formatActiveTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  // Navigate to Garmin Settings
  const navigateToSettings = () => {
    navigation.navigate('GarminSettings' as never);
  };

  // Navigate to see all daily summaries
  const viewAllSummaries = () => {
    navigation.navigate('Settings', {
      screen: 'GarminDailySummaries'
    });
  };

  // Render connection status section (updated)
  const renderConnectionStatus = () => {
    if (loading && !refreshing && !forceRefreshing) {
      return (
        <Card style={styles(theme, fitnessColors).loadingCard}>
          <ActivityIndicator animating={true} color={theme.colors.primary} />
          <Text style={styles(theme, fitnessColors).loadingText}>Loading Garmin data...</Text>
        </Card>
      );
    }

    if (!connectionStatus?.connected) {
      return (
        <Card style={styles(theme, fitnessColors).notConnectedCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).cardTitle}>Connect Garmin</Title>
            <Paragraph style={styles(theme, fitnessColors).cardText}>
              Connect your Garmin account to see your activity and health data.
            </Paragraph>
            <Button
              mode="contained"
              onPress={navigateToSettings}
              style={styles(theme, fitnessColors).buttonMargin}
            >
              Connect Account
            </Button>
          </Card.Content>
        </Card>
      );
    }

    if (!connectionStatus.isActive) {
      return (
        <Card style={styles(theme, fitnessColors).notConnectedCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).cardTitle}>Reconnect Garmin</Title>
            <Paragraph style={styles(theme, fitnessColors).cardText}>
              Your Garmin account is not active. Please reconnect to see your data.
            </Paragraph>
            <Button
              mode="contained"
              onPress={navigateToSettings}
              style={styles(theme, fitnessColors).buttonMargin}
            >
              Reconnect Account
            </Button>
          </Card.Content>
        </Card>
      );
    }

    // Determine error message based on fetchError state
    let errorMessage = null;
    if (fetchError) {
        if (fetchError.error === 'RATE_LIMIT') {
            errorMessage = fetchError.message || 'Garmin API rate limit reached. Please try again later.';
        } else if (fetchError.message) {
            errorMessage = `Error: ${fetchError.message}`;
        } else {
            errorMessage = 'An error occurred fetching Garmin data.';
        }
    }

    return (
      <Card style={styles(theme, fitnessColors).card}>
        <Card.Content>
          <View style={styles(theme, fitnessColors).statusHeader}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            <Title style={styles(theme, fitnessColors).statusTitle}>Garmin Connected</Title>
          </View>
          <Paragraph style={styles(theme, fitnessColors).statusText}>
            Last sync attempt: {connectionStatus?.lastSyncTime ? format(parseISO(connectionStatus.lastSyncTime), 'MMM d, yyyy h:mm a') : 'Never'}
          </Paragraph>
          {/* Display error message if fetchError exists */}
          {errorMessage && (
             <Paragraph style={styles(theme, fitnessColors).errorTextSmall}>
               {errorMessage}
             </Paragraph>
          )}
          <View style={styles(theme, fitnessColors).buttonRow}>
            <Button
              mode="outlined"
              onPress={debugGarminIntegration}
              style={styles(theme, fitnessColors).debugButton}
            >
              Debug
            </Button>
            <Button
              mode="outlined"
              onPress={onForceRefreshPress}
              loading={forceRefreshing}
              disabled={refreshing || loading}
              style={styles(theme, fitnessColors).syncButton}
            >
              Force Refresh
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render daily summary card (updated error handling)
  const renderDailySummary = () => {
    // Show loading indicator within card area if loading and not pull-refreshing
    if (loading && !refreshing) return null; // Main loading indicator handles this

    // Don't render summary if not connected
    if (!connectionStatus?.connected) return null;

    // Show specific error card if fetchError exists (e.g., rate limit)
    // We can refine this to show different cards based on error type if needed
    if (fetchError && !dailySummary) {
       let errorTitle = 'Error Fetching Summary';
       let errorMsg = fetchError.message || 'Could not load Garmin data.';
       let errorIcon = "alert-circle-outline";

       if (fetchError.error === 'RATE_LIMIT') {
           errorTitle = 'Garmin API Rate Limited';
           errorIcon = "timer-sand-paused";
       }

       return (
        <Card style={[styles(theme, fitnessColors).card, styles(theme, fitnessColors).errorCard]}>
          <Card.Content style={styles(theme, fitnessColors).centerContent}>
            <MaterialCommunityIcons name={errorIcon} size={32} color={'#FFFFFF'} />
            <Title style={[styles(theme, fitnessColors).cardTitle, styles(theme, fitnessColors).errorText]}>{errorTitle}</Title>
            <Paragraph style={styles(theme, fitnessColors).errorText}>
              {errorMsg}
            </Paragraph>
            {/* Optionally add a retry button here? */}
          </Card.Content>
        </Card>
      );
    }

    // Show card indicating no data if summary is null and no error
    if (!dailySummary && !fetchError) {
      return (
        <Card style={styles(theme, fitnessColors).card}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).cardTitle}>Today's Summary</Title>
            <Paragraph>No summary data available for today.</Paragraph>
            {/* Optional: Button to try force refresh */}
            <Button onPress={handleManualForceRefresh} loading={forceRefreshing} disabled={refreshing || loading} style={{marginTop: 10}}>
                Try Refreshing Now
            </Button>
          </Card.Content>
        </Card>
      );
    }

    // If we have summary data, render it (even if there was a fallback error)
    if (dailySummary) {
      // Log daily summary data to debug
      console.log('===== DAILY SUMMARY DATA =====');
      console.log(JSON.stringify(dailySummary, null, 2));
      console.log('Activity Minutes Breakdown:');
      console.log('- Highly active:', dailySummary.minutes_highly_active);
      console.log('- Moderately active:', dailySummary.minutes_moderately_active);
      console.log('- Lightly active:', dailySummary.minutes_lightly_active);
      console.log('- Sedentary:', dailySummary.minutes_sedentary);
      console.log('Steps:', dailySummary.total_steps);
      console.log('Distance:', dailySummary.total_distance_meters);
      console.log('===== END SUMMARY DATA =====');

      return (
        <Card style={styles(theme, fitnessColors).card}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Today's Activity</Title>

            <View style={styles(theme, fitnessColors).statsGrid}>
              {/* Steps */}
              <View style={styles(theme, fitnessColors).statItem}>
                <MaterialCommunityIcons name="shoe-print" size={24} color={fitnessColors.primary} />
                <Text style={styles(theme, fitnessColors).statValue}>
                  {dailySummary.total_steps ? dailySummary.total_steps.toLocaleString() : "--"}
                </Text>
                <Text style={styles(theme, fitnessColors).statLabel}>Steps</Text>
              </View>

              {/* Distance - now in miles */}
              <View style={styles(theme, fitnessColors).statItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color={fitnessColors.primary} />
                <Text style={styles(theme, fitnessColors).statValue}>
                  {dailySummary.total_distance_meters ? formatDistance(dailySummary.total_distance_meters) : "--"}
                </Text>
                <Text style={styles(theme, fitnessColors).statLabel}>Distance</Text>
              </View>

              {/* Calories */}
              <View style={styles(theme, fitnessColors).statItem}>
                <MaterialCommunityIcons name="fire" size={24} color={fitnessColors.primary} />
                <Text style={styles(theme, fitnessColors).statValue}>
                  {dailySummary.total_calories ? dailySummary.total_calories.toLocaleString() : "--"}
                </Text>
                <Text style={styles(theme, fitnessColors).statLabel}>Calories</Text>
              </View>

              {/* Active Minutes */}
              <View style={styles(theme, fitnessColors).statItem}>
                <MaterialCommunityIcons name="clock-time-four" size={24} color={fitnessColors.primary} />
                <Text style={styles(theme, fitnessColors).statValue}>
                  {(() => {
                    // Check if we have any valid activity data
                    const hasHighlyActive = dailySummary.minutes_highly_active !== undefined && dailySummary.minutes_highly_active !== null;
                    const hasModActive = dailySummary.minutes_moderately_active !== undefined && dailySummary.minutes_moderately_active !== null;
                    const hasLightActive = dailySummary.minutes_lightly_active !== undefined && dailySummary.minutes_lightly_active !== null;

                    // Only calculate if we have at least one valid value
                    if (hasHighlyActive || hasModActive || hasLightActive) {
                      const highlyActive = hasHighlyActive ? dailySummary.minutes_highly_active : 0;
                      const modActive = hasModActive ? dailySummary.minutes_moderately_active : 0;
                      const lightActive = hasLightActive ? dailySummary.minutes_lightly_active : 0;

                      const totalActive = highlyActive + modActive + lightActive;
                      return totalActive;
                    }

                    return "--";
                  })()}
                </Text>
                <Text style={styles(theme, fitnessColors).statLabel}>Active Min</Text>
              </View>
            </View>

            {/* Calorie breakdown */}
            <View style={styles(theme, fitnessColors).calorieBreakdown}>
              <Text style={styles(theme, fitnessColors).breakdownTitle}>Calorie Breakdown:</Text>
              <View style={styles(theme, fitnessColors).breakdownItem}>
                <Text style={styles(theme, fitnessColors).breakdownLabel}>Base:</Text>
                <Text style={styles(theme, fitnessColors).breakdownValue}>
                  {dailySummary.bmr_calories ? dailySummary.bmr_calories.toLocaleString() : "--"}
                </Text>
              </View>
              <View style={styles(theme, fitnessColors).breakdownItem}>
                <Text style={styles(theme, fitnessColors).breakdownLabel}>Active:</Text>
                <Text style={styles(theme, fitnessColors).breakdownValue}>
                  {dailySummary.active_calories ? dailySummary.active_calories.toLocaleString() : "--"}
                </Text>
              </View>
            </View>

            {/* Activity minutes breakdown */}
            <View style={styles(theme, fitnessColors).activityBreakdown}>
              <Text style={styles(theme, fitnessColors).breakdownTitle}>Activity Minutes:</Text>
              <View style={styles(theme, fitnessColors).activityBar}>
                <View
                  style={[
                    styles(theme, fitnessColors).activitySegment,
                    {
                      flex: dailySummary.minutes_highly_active || 1,
                      backgroundColor: fitnessColors.highActivity
                    }
                  ]}
                />
                <View
                  style={[
                    styles(theme, fitnessColors).activitySegment,
                    {
                      flex: dailySummary.minutes_moderately_active || 1,
                      backgroundColor: fitnessColors.modActivity
                    }
                  ]}
                />
                <View
                  style={[
                    styles(theme, fitnessColors).activitySegment,
                    {
                      flex: dailySummary.minutes_lightly_active || 1,
                      backgroundColor: fitnessColors.lowActivity
                    }
                  ]}
                />
                <View
                  style={[
                    styles(theme, fitnessColors).activitySegment,
                    {
                      flex: dailySummary.minutes_sedentary || 1,
                      backgroundColor: fitnessColors.sedentary
                    }
                  ]}
                />
              </View>
              <View style={styles(theme, fitnessColors).activityLegend}>
                <View style={styles(theme, fitnessColors).legendItem}>
                  <View style={[styles(theme, fitnessColors).legendColor, { backgroundColor: fitnessColors.highActivity }]} />
                  <Text style={styles(theme, fitnessColors).legendText}>
                    High: {dailySummary.minutes_highly_active !== undefined && dailySummary.minutes_highly_active !== null ? dailySummary.minutes_highly_active : "--"} min
                  </Text>
                </View>
                <View style={styles(theme, fitnessColors).legendItem}>
                  <View style={[styles(theme, fitnessColors).legendColor, { backgroundColor: fitnessColors.modActivity }]} />
                  <Text style={styles(theme, fitnessColors).legendText}>
                    Mod: {dailySummary.minutes_moderately_active !== undefined && dailySummary.minutes_moderately_active !== null ? dailySummary.minutes_moderately_active : "--"} min
                  </Text>
                </View>
                <View style={styles(theme, fitnessColors).legendItem}>
                  <View style={[styles(theme, fitnessColors).legendColor, { backgroundColor: fitnessColors.lowActivity }]} />
                  <Text style={styles(theme, fitnessColors).legendText}>
                    Light: {dailySummary.minutes_lightly_active !== undefined && dailySummary.minutes_lightly_active !== null ? dailySummary.minutes_lightly_active : "--"} min
                  </Text>
                </View>
                <View style={styles(theme, fitnessColors).legendItem}>
                  <View style={[styles(theme, fitnessColors).legendColor, { backgroundColor: fitnessColors.sedentary }]} />
                  <Text style={styles(theme, fitnessColors).legendText}>
                    Sed: {dailySummary.minutes_sedentary ?? "--"} min
                  </Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    }

    // Fallback if none of the above conditions met (shouldn't happen)
    return null;
  };

  return (
    <View style={styles(theme, fitnessColors).container}>
      <ScrollView
        contentContainerStyle={styles(theme, fitnessColors).scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Show main loading indicator only on initial load */}
        {loading && !refreshing && (
          <View style={styles(theme, fitnessColors).loadingContainer}>
            <ActivityIndicator size="large" color={fitnessColors.primary} />
            <Text style={styles(theme, fitnessColors).loadingText}>Loading fitness data...</Text>
          </View>
        )}

        {/* Render content when not initial loading */}
        {!loading && (
          <>
            {/* Render Summary Card FIRST (handles its own error/empty states) */}
            {connectionStatus?.connected && renderDailySummary()}

            {/* Render Connection Status Card SECOND (handles its own error state) */}
            {renderConnectionStatus()}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = (theme: any, colors?: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors?.background || (theme.dark ? theme.colors.background : '#f5f5f5'),
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: colors?.surface || theme.colors.surface,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors?.borderColor || 'transparent',
  },
  errorCard: {
    backgroundColor: colors?.error || theme.colors.error,
    borderColor: 'darkred',
    borderWidth: 1,
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorTextSmall: {
    color: colors?.error || theme.colors.error,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 5,
  },
  centerContent: {
    padding: 24,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors?.text || theme.colors.text,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors?.placeholder || theme.colors.disabled,
  },
  button: {
    marginTop: 15,
    backgroundColor: colors?.primary || theme.colors.primary,
  },
  divider: {
    marginVertical: 10,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusTitle: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  statusText: {
    fontSize: 14,
    color: colors?.placeholder || theme.colors.disabled,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  debugButton: {
    borderColor: colors?.placeholder || theme.colors.disabled,
    flex: 1,
    marginRight: 5,
  },
  syncButton: {
    borderColor: colors?.primary || theme.colors.primary,
    flex: 1,
    marginLeft: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  summaryItem: {
    width: '30%',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
    color: colors?.text || theme.colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors?.placeholder || theme.colors.disabled,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    width: '25%',
  },
  statLabel: {
    fontSize: 12,
    color: colors?.placeholder || theme.colors.placeholder,
    marginTop: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    color: colors?.text || theme.colors.text,
  },
  calorieBreakdown: {
    marginTop: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors?.placeholder || theme.colors.placeholder,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  activityBreakdown: {
    marginTop: 12,
  },
  activityBar: {
    flexDirection: 'row',
    height: 20,
    backgroundColor: colors?.accent || theme.colors.accent,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activitySegment: {
    flex: 1,
  },
  activityLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors?.text || theme.colors.text,
  },
  loadingCard: {
    marginBottom: 16,
    backgroundColor: colors?.surface || theme.colors.surface,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors?.borderColor || 'transparent',
  },
  notConnectedCard: {
    marginBottom: 16,
    backgroundColor: colors?.surface || theme.colors.surface,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors?.borderColor || 'transparent',
  },
  buttonMargin: {
    marginHorizontal: 4,
  },
  cardText: {
    fontSize: 14,
    color: colors?.placeholder || theme.colors.placeholder,
  },
});

export default FitnessScreen;