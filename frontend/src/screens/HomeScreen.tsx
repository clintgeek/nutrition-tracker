import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Paragraph, useTheme, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// Import the TodaySummary component
import TodaySummary from '../components/home/TodaySummary';

const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const navigateToSummary = () => {
    // For now, this will just stay on the home screen
    // In the future, you could create a dedicated summary screen
  };

  const navigateToFoodLog = () => {
    navigation.navigate('LogStack');
  };

  const navigateToFoodDatabase = () => {
    navigation.navigate('FoodStack');
  };

  const navigateToGoals = () => {
    navigation.navigate('GoalsStack');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Today's Summary */}
        <TouchableOpacity onPress={navigateToSummary}>
          <TodaySummary />
        </TouchableOpacity>

        {/* Food Log */}
        <TouchableOpacity onPress={navigateToFoodLog}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={50}
                icon="notebook"
                style={{ backgroundColor: '#4CAF50' }}
              />
              <View style={styles.cardTextContent}>
                <Title style={{ color: '#4CAF50' }}>Food Log</Title>
                <Paragraph>Log your meals and track your nutrition.</Paragraph>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        {/* Food Database */}
        <TouchableOpacity onPress={navigateToFoodDatabase}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={50}
                icon="food-apple"
                style={{ backgroundColor: '#FF9800' }}
              />
              <View style={styles.cardTextContent}>
                <Title style={{ color: '#FF9800' }}>Food Database</Title>
                <Paragraph>Browse and add foods to your database.</Paragraph>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>

        {/* Goals */}
        <TouchableOpacity onPress={navigateToGoals}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={50}
                icon="flag"
                style={{ backgroundColor: '#E91E63' }}
              />
              <View style={styles.cardTextContent}>
                <Title style={{ color: '#E91E63' }}>Goals</Title>
                <Paragraph>Set and track your nutrition goals.</Paragraph>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTextContent: {
    marginLeft: 16,
    flex: 1,
  },
});

export default HomeScreen;
