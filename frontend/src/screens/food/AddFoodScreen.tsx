import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput, Alert, Keyboard } from 'react-native';
import { Button, Title, useTheme, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { CreateFoodDTO } from '../../types/Food';
import { foodService } from '../../services/foodService';
import { useAuth } from '../../contexts/AuthContext';

const AddFoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, token } = useAuth();  // Get auth state

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Check authentication
  useEffect(() => {
    if (!user || !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to add custom foods.',
        [{
          text: 'OK',
          onPress: () => navigation.navigate('Auth', { screen: 'Login' })
        }]
      );
    }
  }, [user, token, navigation]);

  // Handle unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = name || calories || protein || carbs || fat || servingSize !== '1' || servingUnit !== 'serving';

    if (hasUnsavedChanges) {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        if (isLoading) {
          // Don't prompt while saving
          return;
        }

        e.preventDefault();

        Alert.alert(
          'Discard changes?',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            { text: "Don't leave", style: 'cancel', onPress: () => {} },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      });

      return unsubscribe;
    }
  }, [name, calories, protein, carbs, fat, servingSize, servingUnit, navigation, isLoading]);

  const validateForm = () => {
    // Trim whitespace from name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Food name is required');
      return false;
    }

    // Validate numeric fields
    const caloriesNum = Number(calories);
    const proteinNum = Number(protein || 0);
    const carbsNum = Number(carbs || 0);
    const fatNum = Number(fat || 0);
    const servingSizeNum = Number(servingSize);

    if (isNaN(caloriesNum) || caloriesNum < 0 || caloriesNum > 2000) {
      setError('Calories must be between 0 and 2000 per serving');
      return false;
    }

    // Validate macros
    if (isNaN(proteinNum) || proteinNum < 0 || proteinNum > 200) {
      setError('Protein must be between 0 and 200 grams');
      return false;
    }

    if (isNaN(carbsNum) || carbsNum < 0 || carbsNum > 200) {
      setError('Carbs must be between 0 and 200 grams');
      return false;
    }

    if (isNaN(fatNum) || fatNum < 0 || fatNum > 200) {
      setError('Fat must be between 0 and 200 grams');
      return false;
    }

    // Validate serving size
    if (isNaN(servingSizeNum) || servingSizeNum <= 0) {
      setError('Serving size must be greater than 0');
      return false;
    }

    // Validate macro sum makes sense with calories (allow 15% margin)
    const calculatedCalories = (proteinNum * 4) + (carbsNum * 4) + (fatNum * 9);
    if (calculatedCalories > caloriesNum * 1.15) {
      setError('Total calories from macronutrients exceeds specified calories by more than 15%');
      return false;
    }

    // Validate serving unit
    if (!servingUnit.trim()) {
      setError('Serving unit is required');
      return false;
    }

    return true;
  };

  const handleError = (err: unknown) => {
    console.error('Add food error:', err);

    if (axios.isAxiosError(err)) {
      const errorMessage = err.response?.data?.message || 'Failed to add food. Please try again.';
      if (err.response?.status === 409) {
        setError('A food with this name already exists. Please use a different name.');
      } else if (err.response?.status === 413) {
        setError('The food data is too large. Please try again with smaller values.');
      } else if (err.response?.status === 400) {
        setError(`Validation error: ${errorMessage}`);
      } else {
        setError(`Server error: ${errorMessage}`);
      }
      console.error('API Error Details:', err.response?.data);
    } else if (err instanceof Error) {
      setError(`Error: ${err.message}`);
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleSubmit = async () => {
    // Check authentication first
    if (!user || !token) {
      setError('You must be logged in to add custom foods.');
      return;
    }

    Keyboard.dismiss();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    const foodData: CreateFoodDTO = {
      name: name.trim(),
      calories: Math.round(Number(calories)),
      protein: Number(parseFloat(protein || '0').toFixed(1)),
      carbs: Number(parseFloat(carbs || '0').toFixed(1)),
      fat: Number(parseFloat(fat || '0').toFixed(1)),
      servingSize: Number(servingSize) || 1,
      servingUnit: servingUnit.trim() || 'serving',
      source: 'custom'  // Required field for the backend
    };

    try {
      console.log('Creating custom food:', foodData);
      const result = await foodService.createCustomFood(foodData);
      console.log('Food created successfully:', result);

      // Clear form
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setServingSize('1');
      setServingUnit('serving');

      // Show success message and navigate back
      Alert.alert(
        'Success',
        'Food added successfully!',
        [{
          text: 'OK',
          onPress: () => {
            console.log('Navigating back to food list');
            navigation.goBack();
          }
        }]
      );
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      // More detailed error handling
      let errorMessage = 'Failed to add food. ';
      if (err instanceof Error) {
        errorMessage += err.message;
      } else if (typeof err === 'object' && err !== null) {
        errorMessage += JSON.stringify(err);
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Title style={styles.title}>Add Custom Food</Title>

        {error ? <View style={styles.errorContainer}><Text style={styles.error}>{error}</Text></View> : null}

        <RNTextInput
          placeholder="Food Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
          returnKeyType="next"
          autoFocus
          maxLength={100}
        />

        <RNTextInput
          placeholder="Calories (per serving) *"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          style={styles.input}
          returnKeyType="next"
          maxLength={4}
        />

        <View style={styles.row}>
          <RNTextInput
            placeholder="Protein (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Carbs (g)"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Fat (g)"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
            returnKeyType="next"
            maxLength={5}
          />
        </View>

        <View style={styles.row}>
          <RNTextInput
            placeholder="Serving Size *"
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            returnKeyType="next"
            maxLength={5}
          />

          <RNTextInput
            placeholder="Serving Unit *"
            value={servingUnit}
            onChangeText={setServingUnit}
            style={[styles.input, { flex: 2 }]}
            returnKeyType="done"
            maxLength={20}
            onSubmitEditing={handleSubmit}
          />
        </View>

        <Text style={styles.hint}>* Required fields</Text>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={isLoading}
          disabled={isLoading}
        >
          Add Food
        </Button>
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
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  button: {
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  error: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

export default AddFoodScreen;