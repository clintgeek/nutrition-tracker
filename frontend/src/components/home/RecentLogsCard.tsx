import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Text, Divider, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../../types/navigation';

import { FoodLog } from '../../types/FoodLog';
import { formatDate } from '../../utils/dateUtils';

interface RecentLogsCardProps {
  recentLogs: FoodLog[];
}

const RecentLogsCard: React.FC<RecentLogsCardProps> = ({ recentLogs }) => {
  const theme = useTheme();
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();

  const navigateToLogDetails = (logId: string) => {
    navigation.navigate('LogDetails', { logId });
  };

  const renderLogItem = ({ item }: { item: FoodLog }) => {
    return (
      <View>
        <View style={styles(theme).logItem}>
          <View style={styles(theme).foodImageContainer}>
            <Avatar.Icon
              icon="food"
              size={40}
              color={theme.colors.onPrimary}
              style={{ backgroundColor: theme.colors.primary }}
            />
          </View>

          <View style={styles(theme).foodInfo}>
            <Text style={styles(theme).foodName}>{item.food?.name || item.food_name || 'Unknown Food'}</Text>
            <Text style={styles(theme).foodDetails}>
              {item.serving_size || item.servings || '1'} {item.serving_unit || 'servings'} • {formatDate(item.log_date || item.created_at || new Date().toISOString())} • {item.meal_type || 'meal'}
            </Text>
          </View>

          <View style={styles(theme).caloriesContainer}>
            <Text style={styles(theme).calories}>
              {Math.round(
                Number(item.total_calories) ||
                Number(item.calories) ||
                (Number(item.calories_per_serving) * Number(item.servings)) ||
                0
              )}
            </Text>
            <Text style={styles(theme).caloriesLabel}>cal</Text>
          </View>
        </View>
        <Divider style={styles(theme).divider} />
      </View>
    );
  };

  return (
    <Card style={styles(theme).card}>
      <Card.Content>
        <Title style={styles(theme).title}>Recent Food Logs</Title>

        {recentLogs.length > 0 ? (
          <FlatList
            data={recentLogs.slice(0, 5)} // Show only the 5 most recent logs
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <Divider style={styles(theme).divider} />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles(theme).noLogsText}>
            No recent food logs. Start tracking your meals to see them here.
          </Text>
        )}
      </Card.Content>

      {recentLogs.length > 0 && (
        <Card.Actions>
          <Text
            style={styles(theme).viewAllButton}
            onPress={() => navigation.navigate('Log')}
          >
            View All Logs
          </Text>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = (theme: any) => StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
  },
  title: {
    marginBottom: 16,
    color: theme.colors.onSurface,
    fontSize: 20,
    fontWeight: 'bold',
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodImageContainer: {
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontWeight: 'bold',
    textTransform: 'capitalize',
    fontSize: 16,
    marginBottom: 4,
    color: theme.colors.onSurface,
  },
  foodDetails: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  caloriesContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },
  calories: {
    fontWeight: 'bold',
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  caloriesLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  noLogsText: {
    textAlign: 'center',
    marginVertical: 20,
    color: theme.colors.onSurfaceVariant,
  },
  viewAllButton: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    backgroundColor: theme.colors.surfaceVariant,
    height: 1,
  },
});

export default RecentLogsCard;