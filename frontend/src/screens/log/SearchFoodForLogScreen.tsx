import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogStackParamList } from '../../types/navigation';
import { Food } from '../../types/Food';
import { FoodSearch } from '../../components/food/FoodSearch';
import { saveFoodToContext } from '../../services/foodSaveService';
import { FoodSaveContext } from '../../types/FoodSaveContext';
import EditFoodForLogModal from './EditFoodForLogModal';

interface SearchFoodForLogScreenProps {
  navigation: any;
  route: {
    params: {
      saveContext: FoodSaveContext;
    };
  };
}

export const SearchFoodForLogScreen: React.FC<SearchFoodForLogScreenProps> = ({ navigation, route }) => {
  const { saveContext } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  if (!saveContext) {
    // Show an alert and render nothing if saveContext is missing
    React.useEffect(() => {
      alert('Missing save context. Please navigate to this screen from a meal log.');
      navigation.goBack();
    }, []);
    return null;
  }

  const handleSelectFood = useCallback((food: Food) => {
    setSelectedFood(food);
  }, []);

  const handleSaveEditedFood = useCallback(async (editedFood: Food) => {
    await saveFoodToContext(editedFood, saveContext);
    navigation.navigate('LogList', { refresh: true });
  }, [saveContext, navigation]);

  const handleCancelEdit = useCallback((shouldReturnToLog?: boolean) => {
    setSelectedFood(null);
    if (shouldReturnToLog) {
      navigation.navigate('LogList', { refresh: true });
    }
  }, [navigation]);

  const handleBarcodePress = useCallback(() => {
    navigation.navigate('BarcodeScanner', {
      mealType: saveContext.mealType,
      date: saveContext.date,
      fromLog: true
    });
  }, [navigation, saveContext]);

  return (
    <View style={styles.container}>
      <FoodSearch
        onSelectFood={handleSelectFood}
        onBarcodePress={handleBarcodePress}
        showRecentFoods={true}
        showCustomFoods={true}
        showRecipeFoods={true}
        showExternalFoods={true}
        emptyStateMessage="Search for foods to add to your log..."
        emptyStateIcon="nutrition-outline"
      />
      {selectedFood && (
        <EditFoodForLogModal
          food={selectedFood}
          saveContext={saveContext}
          visible={!!selectedFood}
          onClose={handleCancelEdit}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});