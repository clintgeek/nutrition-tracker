import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput, Alert } from 'react-native';
import { Button, Title, useTheme, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

import { foodService } from '../../services/foodService';

const AddFoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('1');
  const [servingUnit, setServingUnit] = useState('serving');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!name.trim()) {
      setError('Food name is required');
      return false;
    }

    if (!calories.trim() || isNaN(Number(calories))) {
      setError('Valid calories value is required');
      return false;
    }

    // Check if protein, carbs, and fat are valid numbers if provided
    if (protein.trim() && isNaN(Number(protein))) {
      setError('Protein must be a valid number');
      return false;
    }

    if (carbs.trim() && isNaN(Number(carbs))) {
      setError('Carbs must be a valid number');
      return false;
    }

    if (fat.trim() && isNaN(Number(fat))) {
      setError('Fat must be a valid number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    // Log the data being sent
    const foodData = {
      name,
      calories_per_serving: parseInt(calories, 10),
      protein_grams: parseFloat(protein) || 0,
      carbs_grams: parseFloat(carbs) || 0,
      fat_grams: parseFloat(fat) || 0,
      serving_size: servingSize,
      serving_unit: servingUnit,
    };

    console.log('Submitting food data:', foodData);

    try {
      const result = await foodService.createCustomFood(foodData);
      console.log('Food created successfully:', result);

      // Show success message
      Alert.alert('Success', 'Food added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Add food error:', err);

      // More detailed error handling
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || 'Failed to add food. Please try again.';
        setError(`API Error: ${errorMessage}`);
        console.error('API Error Details:', err.response?.data);
      } else {
        setError(`Error: ${err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Add Custom Food</Title>

        {error ? <View style={styles.errorContainer}><Text style={styles.error}>{error}</Text></View> : null}

        <RNTextInput
          placeholder="Food Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <RNTextInput
          placeholder="Calories (per serving)"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          style={styles.input}
        />

        <View style={styles.row}>
          <RNTextInput
            placeholder="Protein (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
          />

          <RNTextInput
            placeholder="Carbs (g)"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
          />

          <RNTextInput
            placeholder="Fat (g)"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            style={[styles.input, styles.rowInput]}
          />
        </View>

        <View style={styles.row}>
          <RNTextInput
            placeholder="Serving Size"
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
          />

          <RNTextInput
            placeholder="Serving Unit"
            value={servingUnit}
            onChangeText={setServingUnit}
            style={[styles.input, { flex: 2 }]}
          />
        </View>

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
});

export default AddFoodScreen;