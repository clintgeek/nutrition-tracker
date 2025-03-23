import React, { useState } from 'react';
import { View, StyleSheet, Platform, ScrollView, TextInput as RNTextInput } from 'react-native';
import { Text, Button, useTheme, Portal, Dialog } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { format } from 'date-fns';

export const AddFoodLogScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const [servings, setServings] = useState('1');
  const [servingSize, setServingSize] = useState('');
  const [servingUnit, setServingUnit] = useState('g');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealType, setMealType] = useState('breakfast');

  const handleSave = () => {
    // Your existing save logic
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Servings Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Servings</Text>
          <RNTextInput
            style={[styles.input, styles.textInput]}
            value={servings}
            onChangeText={setServings}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Serving Size with Unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Serving Size</Text>
          <View style={styles.servingSizeContainer}>
            <RNTextInput
              style={[styles.input, styles.textInput, { flex: 1 }]}
              value={servingSize}
              onChangeText={setServingSize}
              keyboardType="decimal-pad"
            />
            <RNTextInput
              style={[styles.input, styles.textInput, { width: 60, marginLeft: 8 }]}
              value={servingUnit}
              onChangeText={setServingUnit}
            />
          </View>
        </View>

        {/* Meal Type Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Meal Type</Text>
          <View style={styles.mealTypeContainer}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
              <Button
                key={type}
                mode={mealType === type ? 'contained' : 'outlined'}
                onPress={() => setMealType(type)}
                style={styles.mealTypeButton}
                labelStyle={styles.mealTypeLabel}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <DatePickerInput
            locale="en"
            value={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            inputMode="start"
            style={[styles.input, styles.dateInput]}
          />
        </View>

        {/* Nutrition Information Card */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Nutrition Information</Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>105</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>1</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>27</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>0</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.saveButton}
        >
          Save Food Log
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  servingSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: '40%',
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 14,
  },
  dateInput: {
    backgroundColor: '#fff',
  },
  nutritionCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  nutritionItem: {
    alignItems: 'center',
    minWidth: '25%',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  nutritionLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

export default AddFoodLogScreen;