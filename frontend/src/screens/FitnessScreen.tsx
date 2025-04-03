import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, ActivityIndicator, useTheme, Divider, Button, FAB } from 'react-native-paper';
import { format, parseISO, subDays, isToday, isYesterday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { fitnessService, GarminActivity, GarminDailySummary, GarminConnectionStatus } from '../services/fitnessService';
import { api } from '../services/api';

/**
 * Fitness Screen
 * Shows Garmin Connect integration data
 */
const FitnessScreen: React.FC = () => {
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [dailySummary, setDailySummary] = useState<GarminDailySummary | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<GarminConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
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

  // Load data when component mounts
  useEffect(() => {
    loadData();
  }, []);

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

  // Fetch activities and daily summary from the API
  const loadData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setForceRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load connection status
      const status = await fitnessService.checkGarminConnectionStatus();
      setConnectionStatus(status);

      if (status.connected) {
        try {
          // Format date as yyyy-MM-dd
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          // Calculate date 3 days ago (reduced from 7 to minimize API load during testing)
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(today.getDate() - 3);
          const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

          // If doing a force refresh, use the sync function with forceRefresh option
          if (forceRefresh) {
            console.log('Force refreshing data from Garmin API...');
            setSyncing(true);

            // Sync today's data only to minimize API load
            const syncResult = await fitnessService.syncGarminData(todayStr, todayStr, true);
            console.log('Force refresh result:', syncResult);

            if (syncResult.success) {
              console.log(`Successfully force refreshed data: ${syncResult.imported} of ${syncResult.total} summaries imported`);
            } else {
              console.error('Failed to force refresh data:', syncResult.error);
              if (syncResult.error === 'RATE_LIMIT') {
                Alert.alert(
                  'Garmin API Rate Limit',
                  'You have reached the Garmin API rate limit. Please try again later.',
                  [{ text: 'OK' }]
                );
              }
            }

            setSyncing(false);
          } else {
            // Regular sync for non-force refresh
            console.log('Syncing with Garmin...');
            setSyncing(true);

            // Sync past 3 days of summaries
            const syncResult = await fitnessService.syncGarminData(threeDaysAgoStr, todayStr);
            if (syncResult.error === 'RATE_LIMIT') {
              Alert.alert(
                'Garmin API Rate Limit',
                'You have reached the Garmin API rate limit. Please try again later.',
                [{ text: 'OK' }]
              );
            }

            // Import activities for today only to minimize API load
            const importResult = await fitnessService.importGarminActivities(todayStr);
            console.log('Sync result:', syncResult);
            console.log('Import result:', importResult);

            setSyncing(false);
          }

          // Load activities after sync
          const fetchedActivities = await fitnessService.getGarminActivities(3);
          console.log('Fetched activities count:', fetchedActivities.length);
          setActivities(fetchedActivities);

          // Load today's summary - use force refresh option if requested
          console.log(`Loading daily summary from database${forceRefresh ? ' with force refresh' : ''}...`);
          const summary = await fitnessService.getGarminDailySummary(todayStr, forceRefresh);
          console.log('Fetched daily summary:', summary ? 'Found' : 'Not found');
          setDailySummary(summary);
        } catch (loadError) {
          console.error('Error loading database data:', loadError);
        }
      }
    } catch (error) {
      console.error('Error loading fitness data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setForceRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Handle force refresh
  const onForceRefresh = () => {
    Alert.alert(
      'Force Refresh from Garmin',
      'This will bypass all caches and get fresh data directly from Garmin API. This counts against the API rate limits. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', onPress: () => loadData(true) }
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

  // Navigate to see all activities
  const viewAllActivities = () => {
    navigation.navigate('Settings', {
      screen: 'GarminActivities'
    });
  };

  // Navigate to see all daily summaries
  const viewAllSummaries = () => {
    navigation.navigate('Settings', {
      screen: 'GarminDailySummaries'
    });
  };

  // Get icon for activity type
  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      'running': 'run',
      'cycling': 'bike',
      'swimming': 'swim',
      'walking': 'walk',
      'hiking': 'hiking',
      'strength_training': 'weight-lifter',
      'yoga': 'yoga',
      'indoor_cycling': 'bike',
      'elliptical': 'ellipse',
      'treadmill_running': 'run',
      'cardio': 'heart-pulse',
    };

    return iconMap[type.toLowerCase()] || 'run-fast';
  };

  // Render connection status section
  const renderConnectionStatus = () => {
    if (loading && !refreshing && !forceRefreshing) {
      return (
        <Card style={styles(theme).loadingCard}>
          <ActivityIndicator animating={true} color={theme.colors.primary} />
          <Text style={styles(theme).loadingText}>Loading Garmin data...</Text>
        </Card>
      );
    }

    if (!connectionStatus?.connected) {
      return (
        <Card style={styles(theme).notConnectedCard}>
          <Card.Content>
            <Title style={styles(theme).cardTitle}>Connect Garmin</Title>
            <Paragraph style={styles(theme).cardText}>
              Connect your Garmin account to see your activity and health data.
            </Paragraph>
            <Button
              mode="contained"
              onPress={navigateToSettings}
              style={styles(theme).buttonMargin}
            >
              Connect Account
            </Button>
          </Card.Content>
        </Card>
      );
    }

    if (!connectionStatus.isActive) {
      return (
        <Card style={styles(theme).notConnectedCard}>
          <Card.Content>
            <Title style={styles(theme).cardTitle}>Reconnect Garmin</Title>
            <Paragraph style={styles(theme).cardText}>
              Your Garmin account is not active. Please reconnect to see your data.
            </Paragraph>
            <Button
              mode="contained"
              onPress={navigateToSettings}
              style={styles(theme).buttonMargin}
            >
              Reconnect Account
            </Button>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles(theme).statusCard}>
        <Card.Content>
          <View style={styles(theme).statusHeader}>
            <View>
              <Title style={styles(theme).cardTitle}>Garmin Connected</Title>
              <Paragraph style={styles(theme).lastSyncText}>
                Last sync: {connectionStatus.lastSyncTime
                  ? format(new Date(connectionStatus.lastSyncTime), 'MMM d, h:mm a')
                  : 'Never'}
              </Paragraph>
            </View>

            <View style={styles(theme).syncButtonContainer}>
              <Button
                mode="contained"
                icon="sync"
                loading={syncing}
                onPress={() => loadData(true)}
                style={styles(theme).syncNowButton}
              >
                Sync Now
              </Button>
            </View>
          </View>

          <View style={styles(theme).buttonsRow}>
            <Button
              mode="outlined"
              onPress={viewAllActivities}
              style={[styles(theme).smallButton, styles(theme).buttonMargin]}
            >
              All Activities
            </Button>
            <Button
              mode="outlined"
              onPress={viewAllSummaries}
              style={styles(theme).smallButton}
            >
              All Summaries
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render daily summary card
  const renderDailySummary = () => {
    if (!connectionStatus?.connected) {
      return null;
    }

    if (!dailySummary && !loading) {
      return (
        <Card style={styles(theme, fitnessColors).summaryCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Today's Activity</Title>
            <View style={styles(theme, fitnessColors).emptyDataContainer}>
              <MaterialCommunityIcons name="calendar" size={48} color="#ccc" />
              <Text style={styles(theme, fitnessColors).emptyDataText}>No data for today</Text>
              <Paragraph style={{ textAlign: 'center', marginTop: 8, color: fitnessColors.placeholder }}>
                If you just connected, try using the Sync button above to fetch your Garmin data.
              </Paragraph>
              <Paragraph style={{ textAlign: 'center', marginTop: 4, color: fitnessColors.placeholder }}>
                Note: Garmin API has rate limits (approximately 15 requests per hour).
              </Paragraph>
            </View>
          </Card.Content>
        </Card>
      );
    }

    if (loading) {
      return (
        <Card style={styles(theme, fitnessColors).summaryCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Today's Activity</Title>
            <View style={styles(theme, fitnessColors).loadingContainer}>
              <ActivityIndicator size="large" color={fitnessColors.primary} />
              <Text style={styles(theme, fitnessColors).loadingText}>Loading...</Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

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
        <Card style={styles(theme, fitnessColors).summaryCard}>
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

    return null;
  };

  // Render activities section
  const renderActivities = () => {
    if (!connectionStatus?.connected) {
      return null;
    }

    if (loading && !refreshing) {
      return (
        <Card style={styles(theme, fitnessColors).activitiesCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Recent Activities</Title>
            <View style={styles(theme, fitnessColors).loadingContainer}>
              <ActivityIndicator size="large" color={fitnessColors.primary} />
            </View>
          </Card.Content>
        </Card>
      );
    }

    if (activities.length === 0) {
      return (
        <Card style={styles(theme, fitnessColors).activitiesCard}>
          <Card.Content>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Recent Activities</Title>
            <View style={styles(theme, fitnessColors).emptyDataContainer}>
              <MaterialCommunityIcons name="run" size={48} color="#ccc" />
              <Text style={styles(theme, fitnessColors).emptyDataText}>No recent activities</Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles(theme, fitnessColors).activitiesCard}>
        <Card.Content>
          <View style={styles(theme, fitnessColors).sectionHeader}>
            <Title style={styles(theme, fitnessColors).sectionTitle}>Recent Activities</Title>
            <TouchableOpacity onPress={viewAllActivities}>
              <Text style={styles(theme, fitnessColors).viewAllLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {activities.slice(0, 3).map((activity, index) => (
            <React.Fragment key={activity.garmin_activity_id}>
              <View style={styles(theme, fitnessColors).activityItem}>
                <View style={styles(theme, fitnessColors).activityIconContainer}>
                  <MaterialCommunityIcons
                    name={getActivityIcon(activity.activity_type)}
                    size={24}
                    color={fitnessColors.primary}
                  />
                </View>
                <View style={styles(theme, fitnessColors).activityInfo}>
                  <Text style={styles(theme, fitnessColors).activityName}>{activity.activity_name}</Text>
                  <Text style={styles(theme, fitnessColors).activityDate}>{formatDate(activity.start_time)}</Text>
                </View>
                <View style={styles(theme, fitnessColors).activityStats}>
                  <Text style={styles(theme, fitnessColors).activityDuration}>{formatDuration(activity.duration_seconds)}</Text>
                  <Text style={styles(theme, fitnessColors).activityDistance}>{formatDistance(activity.distance_meters)}</Text>
                </View>
              </View>
              {index < activities.length - 1 && <Divider style={styles(theme, fitnessColors).divider} />}
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles(theme, fitnessColors).container}>
      {loading && !refreshing ? (
        <View style={styles(theme, fitnessColors).loadingContainer}>
          <ActivityIndicator size="large" color={fitnessColors.primary} />
          <Text style={{ marginTop: 16, color: fitnessColors.text }}>Loading fitness data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles(theme, fitnessColors).scrollContainer}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[fitnessColors.primary]} />
          }
        >
          {renderDailySummary()}
          {renderActivities()}
          {renderConnectionStatus()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = (theme: any, colors?: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors?.background || (theme.dark ? theme.colors.background : '#f5f5f5'),
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  viewAllLink: {
    color: colors?.primary || theme.colors.primary,
    fontSize: 14,
  },
  connectionCard: {
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
  connectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  connectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  lastSyncText: {
    fontSize: 12,
    color: colors?.placeholder || theme.colors.placeholder,
    marginTop: 2,
  },
  connectButton: {
    marginTop: 16,
    backgroundColor: colors?.primary || theme.colors.primary,
  },
  summaryCard: {
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
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 4,
  },
  heartRateText: {
    fontSize: 14,
    marginLeft: 8,
    color: colors?.text || theme.colors.text,
  },
  activitiesCard: {
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors?.accent || 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors?.primary || theme.colors.primary,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  activityDate: {
    fontSize: 12,
    color: colors?.placeholder || theme.colors.placeholder,
  },
  activityStats: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  activityDistance: {
    fontSize: 12,
    color: colors?.placeholder || theme.colors.placeholder,
  },
  divider: {
    marginVertical: 4,
    backgroundColor: colors?.borderColor || theme.colors.disabled,
  },
  emptyDataContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyDataText: {
    fontSize: 16,
    color: colors?.placeholder || theme.colors.placeholder,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 16,
    color: colors?.text || theme.colors.text,
    marginTop: 16,
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
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  syncButtonContainer: {
    alignItems: 'flex-end',
  },
  syncNowButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  smallButton: {
    flex: 1,
  },
  buttonMargin: {
    marginHorizontal: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors?.text || theme.colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors?.placeholder || theme.colors.placeholder,
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
});

export default FitnessScreen;