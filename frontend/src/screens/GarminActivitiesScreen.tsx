import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, ActivityIndicator, useTheme, Chip, Divider, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { fitnessService, GarminActivity } from '../services/fitnessService';

/**
 * Garmin Activities Screen
 * Shows list of synced Garmin activities
 */
const GarminActivitiesScreen: React.FC = () => {
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const navigation = useNavigation();

  // Load activities when component mounts
  useEffect(() => {
    fetchActivities();
  }, []);

  // Fetch activities from the API
  const fetchActivities = async () => {
    try {
      setLoading(true);
      const fetchedActivities = await fitnessService.getGarminActivities();
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  // Format duration from seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format distance from meters
  const formatDistance = (meters: number) => {
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(2)} km`;
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

  // Render activity card
  const renderActivity = ({ item }: { item: GarminActivity }) => {
    return (
      <Card style={styles(theme).activityCard}>
        <Card.Content>
          <View style={styles(theme).activityHeader}>
            <View style={styles(theme).iconContainer}>
              <MaterialCommunityIcons
                name={getActivityIcon(item.activity_type)}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles(theme).titleContainer}>
              <Title style={styles(theme).activityTitle}>{item.activity_name}</Title>
              <Paragraph style={styles(theme).activityDate}>
                {format(new Date(item.start_time), 'MMM d, yyyy - h:mm a')}
              </Paragraph>
            </View>
          </View>

          <Divider style={styles(theme).divider} />

          <View style={styles(theme).statsContainer}>
            <View style={styles(theme).statItem}>
              <Text style={styles(theme).statLabel}>Duration</Text>
              <Text style={styles(theme).statValue}>{formatDuration(item.duration_seconds)}</Text>
            </View>

            <View style={styles(theme).statItem}>
              <Text style={styles(theme).statLabel}>Distance</Text>
              <Text style={styles(theme).statValue}>{formatDistance(item.distance_meters)}</Text>
            </View>

            <View style={styles(theme).statItem}>
              <Text style={styles(theme).statLabel}>Calories</Text>
              <Text style={styles(theme).statValue}>{item.calories}</Text>
            </View>
          </View>

          {item.avg_heart_rate > 0 && (
            <View style={styles(theme).heartRateContainer}>
              <MaterialCommunityIcons name="heart-pulse" size={16} color={theme.colors.error} />
              <Text style={styles(theme).heartRateText}>
                Avg: {item.avg_heart_rate} bpm / Max: {item.max_heart_rate} bpm
              </Text>
            </View>
          )}

          <Chip
            style={styles(theme).typeChip}
            textStyle={styles(theme).typeChipText}
          >
            {item.activity_type}
          </Chip>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles(theme).loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles(theme).loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.garmin_activity_id}
        contentContainerStyle={styles(theme).listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles(theme).emptyContainer}>
            <MaterialCommunityIcons name="run" size={64} color={theme.colors.placeholder} />
            <Text style={styles(theme).emptyText}>No activities found</Text>
            <Paragraph style={styles(theme).emptySubtext}>
              Sync your Garmin account to see your activities here
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
  activityCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: theme.colors.surface,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  activityDate: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  divider: {
    marginVertical: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.placeholder,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  heartRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  heartRateText: {
    fontSize: 12,
    marginLeft: 4,
    color: theme.colors.text,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: theme.colors.primary + '20',
  },
  typeChipText: {
    fontSize: 12,
    color: theme.colors.primary,
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

export default GarminActivitiesScreen;