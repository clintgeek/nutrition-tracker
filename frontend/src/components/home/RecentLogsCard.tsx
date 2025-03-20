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
        <View style={styles.logItem}>
          <View style={styles.foodImageContainer}>
            <Avatar.Icon
              icon="food"
              size={40}
              color="white"
              style={{ backgroundColor: theme.colors.primary }}
            />
          </View>

          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{item.food?.name || item.food_name || 'Unknown Food'}</Text>
            <Text style={styles.foodDetails}>
              {item.serving_size || item.servings || '1'} {item.serving_unit || 'servings'} • {formatDate(item.log_date || item.created_at || new Date().toISOString())} • {item.meal_type || 'meal'}
            </Text>
          </View>

          <View style={styles.caloriesContainer}>
            <Text style={styles.calories}>
              {Math.round(
                Number(item.total_calories) ||
                Number(item.calories) ||
                (Number(item.calories_per_serving) * Number(item.servings)) ||
                0
              )}
            </Text>
            <Text style={styles.caloriesLabel}>cal</Text>
          </View>
        </View>
        <Divider />
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Recent Food Logs</Title>

        {recentLogs.length > 0 ? (
          <FlatList
            data={recentLogs.slice(0, 5)} // Show only the 5 most recent logs
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <Divider />}
            scrollEnabled={false}
          />
        ) : (
          <Text style={styles.noLogsText}>
            No recent food logs. Start tracking your meals to see them here.
          </Text>
        )}
      </Card.Content>

      {recentLogs.length > 0 && (
        <Card.Actions>
          <Text
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Log')}
          >
            View All Logs
          </Text>
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    marginBottom: 16,
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
  },
  foodDetails: {
    fontSize: 12,
    color: '#757575',
  },
  caloriesContainer: {
    alignItems: 'center',
  },
  calories: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  caloriesLabel: {
    fontSize: 12,
    color: '#757575',
  },
  noLogsText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#757575',
  },
  viewAllButton: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  brandName: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
});

export default RecentLogsCard;