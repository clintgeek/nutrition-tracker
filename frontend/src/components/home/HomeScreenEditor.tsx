import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Button, Switch, useTheme, Card, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Only import the draggable list on native platforms
let DraggableFlatList: any = null;
let ScaleDecorator: any = null;

// Define types for the draggable list
interface RenderItemInfo {
  item: HomeScreenCard;
  drag: () => void;
  isActive: boolean;
}

interface DragEndParams {
  data: HomeScreenCard[];
}

// Use platform check to conditionally import the draggable component
if (Platform.OS !== 'web') {
  const draggable = require('react-native-draggable-flatlist');
  DraggableFlatList = draggable.default;
  ScaleDecorator = draggable.ScaleDecorator;
}

// Add 'fitnessData' to the DEFAULT_CARDS array and ID type
export type HomeScreenCardId = 'todaySummary' | 'weightProgress' | 'weightTrend' | 'mealPlan' | 'recentActivity' | 'fitnessData';

export interface HomeScreenCard {
  id: HomeScreenCardId;
  title: string;
  enabled: boolean;
  order: number;
}

const DEFAULT_CARDS: HomeScreenCard[] = [
  { id: 'todaySummary', title: 'Today\'s Summary', enabled: true, order: 0 },
  { id: 'weightProgress', title: 'Weight Progress', enabled: true, order: 1 },
  { id: 'weightTrend', title: 'Goal Weight Trend', enabled: true, order: 2 },
  { id: 'fitnessData', title: 'Fitness Activity', enabled: true, order: 3 },
  { id: 'mealPlan', title: 'Meal Plan', enabled: true, order: 4 },
  { id: 'recentActivity', title: 'Recent Activity', enabled: true, order: 5 },
];

// Add fitnessData to the card icons mapping
const CARD_ICONS: Record<string, string> = {
  todaySummary: 'silverware-fork-knife',
  weightProgress: 'scale-bathroom',
  weightTrend: 'chart-line',
  mealPlan: 'food-turkey',
  recentActivity: 'clipboard-list',
  fitnessData: 'run', // Add the fitness data icon
};

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (cards: HomeScreenCard[]) => void;
}

const STORAGE_KEY = '@home_screen_layout';

const HomeScreenEditor: React.FC<Props> = ({ visible, onDismiss, onSave }) => {
  const theme = useTheme();
  const [cards, setCards] = useState<HomeScreenCard[]>(DEFAULT_CARDS);

  // Determine if we're on web platform
  const isWeb = Platform.OS === 'web';

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
    // Make sure the order values are correct before saving
    const sortedCards = [...updatedCards].sort((a, b) => a.order - b.order);
    const finalCards = sortedCards.map((card, index) => ({
      ...card,
      order: index
    }));

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalCards));
      onSave(finalCards);
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

  // Move card up in order (decrease order number)
  const moveCardUp = (index: number) => {
    if (index <= 0) return; // Can't move the first card up

    const newCards = [...cards];
    // Swap the card with the one above it
    [newCards[index], newCards[index - 1]] = [newCards[index - 1], newCards[index]];

    // Update order values
    newCards.forEach((card, i) => {
      card.order = i;
    });

    setCards(newCards);
  };

  // Move card down in order (increase order number)
  const moveCardDown = (index: number) => {
    if (index >= cards.length - 1) return; // Can't move the last card down

    const newCards = [...cards];
    // Swap the card with the one below it
    [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];

    // Update order values
    newCards.forEach((card, i) => {
      card.order = i;
    });

    setCards(newCards);
  };

  // Render a single item in our list
  const renderItem = ({ item, drag, isActive }: RenderItemInfo) => {
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
            <View style={styles.cardIconContainer}>
              <MaterialCommunityIcons
                name={CARD_ICONS[item.id] || 'card'}
                size={20}
                color={theme.colors.primary}
              />
            </View>
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

  // Render a non-draggable web-friendly item
  const renderWebItem = (item: HomeScreenCard, index: number) => {
    return (
      <Card key={item.id} style={styles.webCardItem}>
        <View style={styles.cardItemContent}>
          <View style={styles.webCardControls}>
            <TouchableOpacity
              style={[styles.webButton, index === 0 && styles.disabledButton]}
              onPress={() => moveCardUp(index)}
              disabled={index === 0}
            >
              <MaterialCommunityIcons
                name="arrow-up"
                size={20}
                color={index === 0 ? '#ccc' : theme.colors.onSurface}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.webButton, index === cards.length - 1 && styles.disabledButton]}
              onPress={() => moveCardDown(index)}
              disabled={index === cards.length - 1}
            >
              <MaterialCommunityIcons
                name="arrow-down"
                size={20}
                color={index === cards.length - 1 ? '#ccc' : theme.colors.onSurface}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Switch
            value={item.enabled}
            onValueChange={() => toggleCard(item.id)}
          />
        </View>
      </Card>
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
      <Text style={styles.subtitle}>
        {isWeb
          ? "Use up/down arrows to reorder cards and toggle their visibility"
          : "Drag to reorder cards and toggle their visibility"
        }
      </Text>

      {/* For web, use a regular ScrollView with our custom cards */}
      {isWeb ? (
        <ScrollView>
          {cards.map((card, index) => renderWebItem(card, index))}
        </ScrollView>
      ) : (
        /* For native, use the DraggableFlatList */
        <DraggableFlatList
          data={cards}
          onDragEnd={({ data }: DragEndParams) => setCards(data)}
          keyExtractor={(item: HomeScreenCard) => item.id}
          renderItem={renderItem}
        />
      )}

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
  webCardItem: {
    marginVertical: 4,
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
  cardIconContainer: {
    marginRight: 8,
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
  webCardControls: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginRight: 8,
  },
  webButton: {
    padding: 4,
  },
  disabledButton: {
    opacity: 0.3,
  },
});

export default HomeScreenEditor;