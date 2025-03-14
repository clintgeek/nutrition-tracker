import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Title, Text, Divider, Avatar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { RootStackScreenProps } from '../../types/navigation';

import { FoodLog } from '../../types/FoodLog';
import { formatDate } from '../../utils/dateUtils';

interface FoodLogListProps {
  logs: FoodLog[];
}

const FoodLogList: React.FC<FoodLogListProps> = ({ logs }) => {
  const theme = useTheme();
  const navigation = useNavigation<RootStackScreenProps<'Main'>['navigation']>();

  const renderLogItem = ({ item }: { item: FoodLog }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('LogDetail', { logId: item.id })}>
      <Card.Content>
        <View style={styles.logHeader}>
          <Title>{item.food.name}</Title>
          <Text>{formatDate(item.created_at)}</Text>
        </View>
        <Text>Serving size: {item.serving_size}g</Text>
        <Text>Calories: {item.calories}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <FlatList
      data={logs}
      renderItem={renderLogItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  separator: {
    height: 8,
  },
});

export default FoodLogList;