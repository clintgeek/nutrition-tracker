import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GarminDailySummary } from '../../services/fitnessService';

interface FitnessSummaryCardProps {
  fitnessSummary: GarminDailySummary | null;
  isLoading: boolean;
}

/**
 * Fitness Summary Card Component
 * Displays today's fitness metrics from Garmin Connect
 */
const FitnessSummaryCard: React.FC<FitnessSummaryCardProps> = ({ fitnessSummary, isLoading }) => {
  const theme = useTheme();

  // Format distance from meters to miles
  const formatDistance = (meters: number): string => {
    // Convert meters to miles (1 meter = 0.000621371 miles)
    const miles = meters * 0.000621371;
    return miles.toFixed(1);
  };

  if (!fitnessSummary) {
    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Title style={styles.title}>Today's Activity</Title>
          <View style={styles.noDataContainer}>
            <MaterialCommunityIcons name="run" size={40} color="#ccc" />
            <Text style={styles.noDataText}>
              No fitness data available
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <Title style={styles.title}>Today's Activity</Title>

        <View style={styles.metricsContainer}>
          {/* Steps */}
          <View style={styles.metricItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="shoe-print" size={24} color="white" />
            </View>
            <Text style={styles.metricLabel}>Steps</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {fitnessSummary.total_steps?.toLocaleString() || 0}
            </Text>
          </View>

          {/* Distance */}
          <View style={styles.metricItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="map-marker-distance" size={24} color="white" />
            </View>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {formatDistance(fitnessSummary.total_distance_meters || 0)} mi
            </Text>
          </View>

          {/* Calories */}
          <View style={styles.metricItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="fire" size={24} color="white" />
            </View>
            <Text style={styles.metricLabel}>Calories</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {fitnessSummary.total_calories?.toLocaleString() || 0}
            </Text>
          </View>

          {/* Active Minutes */}
          <View style={styles.metricItem}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <MaterialCommunityIcons name="clock-time-four" size={24} color="white" />
            </View>
            <Text style={styles.metricLabel}>Active Min</Text>
            <Text style={[styles.metricValue, { color: theme.colors.text }]}>
              {(fitnessSummary.minutes_highly_active + fitnessSummary.minutes_moderately_active + fitnessSummary.minutes_lightly_active) || 0}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  title: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  metricItem: {
    alignItems: 'center',
    width: '25%',
    padding: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noDataText: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
  },
});

export default FitnessSummaryCard;