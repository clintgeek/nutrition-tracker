import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Button, Title, useTheme, Text, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { CreateFoodDTO } from '../../types/Food';
import { foodService } from '../../services/foodService';

const AddFoodScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  // Form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Food name is required');
      return;
    }

    if (!calories.trim() || isNaN(Number(calories))) {
      setError('Valid calories value is required');
      return;
    }

    setIsLoading(true);
    setError('');

    const foodData: CreateFoodDTO = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      calories: Math.round(Number(calories)),
      protein: Number(parseFloat(protein || '0').toFixed(1)),
      carbs: Number(parseFloat(carbs || '0').toFixed(1)),
      fat: Number(parseFloat(fat || '0').toFixed(1)),
      serving_size: Number(servingSize) || 100,
      serving_unit: servingUnit.trim() || 'g',
      source: 'custom'
    };

    try {
      await foodService.createCustomFood(foodData);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating food:', error);
      setError('Could not create food. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      color: theme.colors.onSurface,
    },
    sectionLabel: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    servingContainer: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    servingSizeContainer: {
      flex: 2,
      marginRight: 8,
    },
    servingUnitContainer: {
      flex: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 8,
      backgroundColor: theme.colors.background,
      marginBottom: 16,
    },
    divider: {
      marginVertical: 16,
    },
    nutritionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    nutritionItem: {
      width: '50%',
      padding: 6,
    },
    nutritionLabel: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 4,
      textAlign: 'center',
    },
    nutritionInput: {
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 4,
      padding: 8,
      textAlign: 'center',
      backgroundColor: theme.colors.background,
    },
    errorContainer: {
      backgroundColor: '#ffebee',
      padding: 8,
      borderRadius: 4,
      marginBottom: 16,
    },
    error: {
      color: theme.colors.error,
      textAlign: 'center',
    },
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Title style={styles.title}>Add Custom Food</Title>

        {error ? <View style={styles.errorContainer}><Text style={styles.error}>{error}</Text></View> : null}

        {/* Food Details */}
        <Text style={styles.sectionLabel}>Food Details</Text>
        <RNTextInput
          placeholder="Food Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
          maxLength={100}
        />
        <RNTextInput
          placeholder="Brand (optional)"
          value={brand}
          onChangeText={setBrand}
          style={styles.input}
          maxLength={100}
        />

        {/* Serving Information */}
        <Text style={styles.sectionLabel}>Serving Information</Text>
        <View style={styles.servingContainer}>
          <View style={styles.servingSizeContainer}>
            <RNTextInput
              placeholder="100"
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="numeric"
              style={styles.input}
              maxLength={5}
            />
          </View>
          <View style={styles.servingUnitContainer}>
            <RNTextInput
              placeholder="g"
              value={servingUnit}
              onChangeText={setServingUnit}
              style={styles.input}
              maxLength={20}
            />
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Nutrition Information */}
        <Text style={styles.sectionLabel}>Nutrition Information</Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <RNTextInput
              placeholder="0"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              style={styles.nutritionInput}
              maxLength={4}
            />
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Protein (g)</Text>
            <RNTextInput
              placeholder="0"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              style={styles.nutritionInput}
              maxLength={5}
            />
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Carbs (g)</Text>
            <RNTextInput
              placeholder="0"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              style={styles.nutritionInput}
              maxLength={5}
            />
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionLabel}>Fat (g)</Text>
            <RNTextInput
              placeholder="0"
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
              style={styles.nutritionInput}
              maxLength={5}
            />
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={{ marginTop: 16 }}
          loading={isLoading}
          disabled={isLoading}
        >
          Create Food
        </Button>
      </View>
    </ScrollView>
  );
};

export default AddFoodScreen;