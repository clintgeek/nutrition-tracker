import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Text, Divider, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { FoodLog } from '../../types/FoodLog';
import { formatDate } from '../../utils/dateUtils';

interface RecentLogsCardProps {
  recentLogs: FoodLog[];
}

const RecentLogsCard: React.FC<RecentLogsCardProps> = ({ recentLogs }) => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const navigateToLogDetails = (logId: string) => {
    navigation.navigate('LogDetails', { logId });
  };

  const renderLogItem = ({ item }: { item: FoodLog }) => {
    return (
      <View>
        <View style={styles.logItem}>
          <View style={styles.foodImageContainer}>
            {item.food.imageUrl ? (
              <Avatar.Image
                source={{ uri: item.food.imageUrl }}
                size={40}
              />
            ) : (
              <Avatar.Icon
                icon="food"
                size={40}
                color="white"
                style={{ backgroundColor: theme.colors.primary }}
              />
            )}
          </View>

          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>{item.food.name}</Text>
            <Text style={styles.foodDetails}>
              {item.servingSize} {item.servingUnit} • {formatDate(item.date)} • {item.mealType}
            </Text>
          </View>

          <View style={styles.caloriesContainer}>
            <Text style={styles.calories}>{Math.round(item.food.calories * item.servingSize)}</Text>
            <Text style={styles.caloriesLabel}>kcal</Text>
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
            keyExtractor={(item) => item.id}
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
});

export default RecentLogsCard;