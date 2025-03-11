import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { TextInput, Button, Title, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (foodData: {
    name: string;
    brand?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
  }) => void;
}

const AddFoodModal: React.FC<AddFoodModalProps> = ({ visible, onClose, onSubmit }) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingSize, setServingSize] = useState('1');

  const handleSubmit = () => {
    if (!name || !calories) {
      // Show error
      return;
    }

    onSubmit({
      name,
      brand: brand || undefined,
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      servingSize: parseFloat(servingSize) || 1,
    });

    // Reset form
    setName('');
    setBrand('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setServingSize('1');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Title>Add Food</Title>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <TextInput
            label="Food Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Brand (Optional)"
            value={brand}
            onChangeText={setBrand}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Calories"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.row}>
            <TextInput
              label="Protein (g)"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
              style={[styles.input, styles.rowInput]}
              mode="outlined"
            />

            <TextInput
              label="Carbs (g)"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
              style={[styles.input, styles.rowInput]}
              mode="outlined"
            />

            <TextInput
              label="Fat (g)"
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
              style={[styles.input, styles.rowInput]}
              mode="outlined"
            />
          </View>

          <TextInput
            label="Serving Size"
            value={servingSize}
            onChangeText={setServingSize}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
          >
            Add Food
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  button: {
    marginTop: 10,
  },
});

export default AddFoodModal;