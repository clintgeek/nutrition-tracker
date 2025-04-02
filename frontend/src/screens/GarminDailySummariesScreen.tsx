import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, ActivityIndicator, useTheme, Divider, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { fitnessService, GarminDailySummary } from '../services/fitnessService';

/**
 * Garmin Daily Summaries Screen
 * Shows list of synced Garmin daily summaries
 */
const GarminDailySummariesScreen: React.FC = () => {
  const [summaries, setSummaries] = useState<GarminDailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation();

  // Load summaries when component mounts
  useEffect(() => {
    fetchSummaries();
  }, []);

  // Fetch summaries from the API
  const fetchSummaries = async () => {
    try {
      setLoading(true);
      // Get summaries for the last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const fetchedSummaries = await fitnessService.getGarminDailySummaries(
        format(startDate, 'yyyy-MM-dd')
      );
      setSummaries(fetchedSummaries);
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchSummaries();
  };

  // Format duration in minutes to hours and minutes
  const formatActiveTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  // Format distance in meters to kilometers
  const formatDistance = (meters: number) => {
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(2)} km`;
  };

  // Render summary card
  const renderSummary = ({ item }: { item: GarminDailySummary }) => {
    const activeMinutes =
      (item.minutes_lightly_active || 0) +
      (item.minutes_moderately_active || 0) +
      (item.minutes_highly_active || 0);

    return (
      <Card style={styles(theme).summaryCard}>
        <Card.Content>
          <View style={styles(theme).summaryHeader}>
            <View style={styles(theme).dateContainer}>
              <Title style={styles(theme).dateText}>{format(parseISO(item.date), 'MMM d, yyyy')}</Title>
            </View>
          </View>

          <Divider style={styles(theme).divider} />

          <View style={styles(theme).statsGrid}>
            <View style={styles(theme).statItem}>
              <MaterialCommunityIcons name="shoe-print" size={20} color={theme.colors.primary} />
              <Text style={styles(theme).statValue}>{item.total_steps?.toLocaleString() || 0}</Text>
              <Text style={styles(theme).statLabel}>Steps</Text>
            </View>

            <View style={styles(theme).statItem}>
              <MaterialCommunityIcons name="map-marker-distance" size={20} color={theme.colors.primary} />
              <Text style={styles(theme).statValue}>{formatDistance(item.total_distance_meters || 0)}</Text>
              <Text style={styles(theme).statLabel}>Distance</Text>
            </View>

            <View style={styles(theme).statItem}>
              <MaterialCommunityIcons name="fire" size={20} color={theme.colors.primary} />
              <Text style={styles(theme).statValue}>{item.total_calories || 0}</Text>
              <Text style={styles(theme).statLabel}>Calories</Text>
            </View>

            <View style={styles(theme).statItem}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color={theme.colors.error} />
              <Text style={styles(theme).statValue}>{item.avg_heart_rate || '-'}</Text>
              <Text style={styles(theme).statLabel}>Avg HR</Text>
            </View>
          </View>

          <Divider style={styles(theme).divider} />

          <View style={styles(theme).activityContainer}>
            <Text style={styles(theme).sectionTitle}>Activity Minutes</Text>
            <View style={styles(theme).activityRow}>
              <View style={styles(theme).activityBarContainer}>
                <View
                  style={[
                    styles(theme).activityBar,
                    {
                      width: `${Math.min(100, (item.minutes_highly_active || 0) / 30 * 100)}%`,
                      backgroundColor: '#FF5252'
                    }
                  ]}
                />
                <Text style={styles(theme).activityLabel}>High</Text>
                <Text style={styles(theme).activityTime}>{item.minutes_highly_active || 0}m</Text>
              </View>

              <View style={styles(theme).activityBarContainer}>
                <View
                  style={[
                    styles(theme).activityBar,
                    {
                      width: `${Math.min(100, (item.minutes_moderately_active || 0) / 60 * 100)}%`,
                      backgroundColor: '#FFB300'
                    }
                  ]}
                />
                <Text style={styles(theme).activityLabel}>Moderate</Text>
                <Text style={styles(theme).activityTime}>{item.minutes_moderately_active || 0}m</Text>
              </View>

              <View style={styles(theme).activityBarContainer}>
                <View
                  style={[
                    styles(theme).activityBar,
                    {
                      width: `${Math.min(100, (item.minutes_lightly_active || 0) / 240 * 100)}%`,
                      backgroundColor: '#4CAF50'
                    }
                  ]}
                />
                <Text style={styles(theme).activityLabel}>Light</Text>
                <Text style={styles(theme).activityTime}>{item.minutes_lightly_active || 0}m</Text>
              </View>

              <View style={styles(theme).activityBarContainer}>
                <View
                  style={[
                    styles(theme).activityBar,
                    {
                      width: `${Math.min(100, (item.minutes_sedentary || 0) / 720 * 100)}%`,
                      backgroundColor: '#9E9E9E'
                    }
                  ]}
                />
                <Text style={styles(theme).activityLabel}>Sedentary</Text>
                <Text style={styles(theme).activityTime}>{formatActiveTime(item.minutes_sedentary || 0)}</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles(theme).loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles(theme).loadingText}>Loading daily summaries...</Text>
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <FlatList
        data={summaries}
        renderItem={renderSummary}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles(theme).listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles(theme).emptyContainer}>
            <MaterialCommunityIcons name="calendar" size={64} color={theme.colors.placeholder} />
            <Text style={styles(theme).emptyText}>No daily summaries found</Text>
            <Paragraph style={styles(theme).emptySubtext}>
              Sync your Garmin account to see your daily activity data here
            </Paragraph>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles(theme).syncButton}
            >
              Go to Sync
            </Button>
          </View>
        )}
      />
    </View>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.dark ? theme.colors.background : '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: theme.colors.surface,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    width: '25%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.placeholder,
    marginTop: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 4,
  },
  activityContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: theme.colors.text,
  },
  activityRow: {
    marginTop: 4,
  },
  activityBarContainer: {
    marginBottom: 12,
  },
  activityBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.text,
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: theme.colors.text,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
    color: theme.colors.placeholder,
  },
  syncButton: {
    marginTop: 24,
  },
});

export default GarminDailySummariesScreen;