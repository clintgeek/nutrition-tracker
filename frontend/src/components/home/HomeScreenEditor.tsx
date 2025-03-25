import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Switch, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

export interface HomeScreenCard {
  id: string;
  title: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_CARDS: HomeScreenCard[] = [
  { id: 'todaySummary', title: 'Today\'s Summary', enabled: true, order: 0 },
  { id: 'weightProgress', title: 'Weight Progress', enabled: true, order: 1 },
  { id: 'weightTrend', title: 'Goal Weight Trend', enabled: true, order: 2 },
  { id: 'mealPlan', title: 'Meal Plan', enabled: true, order: 3 },
  { id: 'recentActivity', title: 'Recent Activity', enabled: true, order: 4 },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (cards: HomeScreenCard[]) => void;
}

const STORAGE_KEY = '@home_screen_layout';

const HomeScreenEditor: React.FC<Props> = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();
  const [cards, setCards] = useState<HomeScreenCard[]>(DEFAULT_CARDS);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    try {
      const savedLayout = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLayout) {
        setCards(JSON.parse(savedLayout));
      }
    } catch (error) {
      console.error('Error loading home screen layout:', error);
    }
  };

  const saveLayout = async (updatedCards: HomeScreenCard[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCards));
      onSave(updatedCards);
    } catch (error) {
      console.error('Error saving home screen layout:', error);
    }
  };

  const toggleCard = (id: string) => {
    const updatedCards = cards.map(card =>
      card.id === id ? { ...card, enabled: !card.enabled } : card
    );
    setCards(updatedCards);
  };

  const renderItem = ({ item, drag, isActive }: any) => {
    return (
      <ScaleDecorator>
        <View style={[
          styles.cardItem,
          { backgroundColor: isActive ? theme.colors.surfaceVariant : theme.colors.surface }
        ]}>
          <View style={styles.cardItemContent}>
            <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
              <MaterialCommunityIcons name="drag" size={20} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Switch
              value={item.enabled}
              onValueChange={() => toggleCard(item.id)}
            />
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  if (!visible) return null;

  return (
    <View style={[
      styles.modalContainer,
      { backgroundColor: theme.colors.background }
    ]}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Home Screen</Text>
        <TouchableOpacity onPress={onDismiss}>
          <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Drag to reorder cards and toggle their visibility</Text>
      <DraggableFlatList
        data={cards}
        onDragEnd={({ data }) => setCards(data)}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />
      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.button}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={() => saveLayout(cards)}
          style={styles.button}
        >
          Save Changes
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '80%',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  cardItem: {
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
  },
  cardItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  dragHandle: {
    marginRight: 8,
    padding: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 8,
  },
  button: {
    minWidth: 100,
  },
});

export default HomeScreenEditor;