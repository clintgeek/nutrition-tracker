import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput as RNTextInput, Text } from 'react-native';
import { Button, Card, useTheme, Portal, Dialog } from 'react-native-paper';
import { Food } from '../../types/Food';
import { foodService } from '../../services/foodService';
import { FoodSaveContext } from '../../types/FoodSaveContext';
import { saveFoodToContext } from '../../services/foodSaveService';

interface EditFoodForLogModalProps {
  food: Food;
  saveContext: FoodSaveContext;
  visible: boolean;
  onClose: (shouldReturnToLog?: boolean) => void;
}

export const EditFoodForLogModal: React.FC<EditFoodForLogModalProps> = ({ food, saveContext, visible, onClose }) => {
  const theme = useTheme();
  const [editedFood, setEditedFood] = useState<Food>({ ...food });
  const [isSaving, setIsSaving] = useState(false);

  // Debug log
  React.useEffect(() => {
    console.log('[EditFoodForLogModal] props', { food, saveContext, visible });
    if (!saveContext) {
      Alert.alert('Error', 'Missing save context. Closing modal.');
      onClose();
    }
  }, [food, saveContext, visible, onClose]);

  const handleChange = (field: keyof Food, value: string) => {
    setEditedFood((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let foodToLog = editedFood;
      if (editedFood.is_custom && editedFood.id) {
        // Update existing custom food
        await foodService.updateCustomFood(Number(editedFood.id), {
          name: editedFood.name,
          brand: editedFood.brand,
          calories: Number(editedFood.calories),
          protein: Number(editedFood.protein),
          carbs: Number(editedFood.carbs),
          fat: Number(editedFood.fat),
          serving_size: Number(editedFood.serving_size),
          serving_unit: editedFood.serving_unit,
          source: 'custom',
        });
      } else if (!editedFood.is_custom) {
        // Create a new custom food for non-custom foods
        foodToLog = await foodService.createCustomFood({
          name: editedFood.name,
          brand: editedFood.brand,
          calories: Number(editedFood.calories),
          protein: Number(editedFood.protein),
          carbs: Number(editedFood.carbs),
          fat: Number(editedFood.fat),
          serving_size: Number(editedFood.serving_size),
          serving_unit: editedFood.serving_unit,
          source: 'custom',
        });
      }
      await saveFoodToContext(foodToLog, saveContext);
      onClose(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to save to log.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsCustom = async () => {
    setIsSaving(true);
    try {
      let customFood = editedFood;
      if (!(editedFood.is_custom && editedFood.id)) {
        customFood = await foodService.createCustomFood({
          name: editedFood.name,
          brand: editedFood.brand,
          calories: Number(editedFood.calories),
          protein: Number(editedFood.protein),
          carbs: Number(editedFood.carbs),
          fat: Number(editedFood.fat),
          serving_size: Number(editedFood.serving_size),
          serving_unit: editedFood.serving_unit,
          source: 'custom',
        });
        Alert.alert('Saved', 'Food saved as custom food!');
      }
      await saveFoodToContext(customFood, saveContext);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save as custom food.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={styles.dialog}>
        <Dialog.Title>Edit Food Before Logging</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <RNTextInput
                value={editedFood.name}
                onChangeText={(v: string) => handleChange('name', v)}
                style={styles.input}
                placeholder="e.g. Banana Nut Muffin"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand</Text>
              <RNTextInput
                value={editedFood.brand || ''}
                onChangeText={(v: string) => handleChange('brand', v)}
                style={styles.input}
                placeholder="Brand (optional)"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calories</Text>
              <RNTextInput
                value={String(editedFood.calories || '')}
                keyboardType="numeric"
                onChangeText={(v: string) => handleChange('calories', v)}
                style={styles.input}
                placeholder="Calories"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Protein (g)</Text>
              <RNTextInput
                value={String(editedFood.protein || '')}
                keyboardType="numeric"
                onChangeText={(v: string) => handleChange('protein', v)}
                style={styles.input}
                placeholder="Protein in grams"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Carbs (g)</Text>
              <RNTextInput
                value={String(editedFood.carbs || '')}
                keyboardType="numeric"
                onChangeText={(v: string) => handleChange('carbs', v)}
                style={styles.input}
                placeholder="Carbs in grams"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fat (g)</Text>
              <RNTextInput
                value={String(editedFood.fat || '')}
                keyboardType="numeric"
                onChangeText={(v: string) => handleChange('fat', v)}
                style={styles.input}
                placeholder="Fat in grams"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Serving Size</Text>
              <RNTextInput
                value={String(editedFood.serving_size || '')}
                keyboardType="numeric"
                onChangeText={(v: string) => handleChange('serving_size', v)}
                style={styles.input}
                placeholder="e.g. 1"
                placeholderTextColor="#b0b0b0"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Serving Unit</Text>
              <RNTextInput
                value={editedFood.serving_unit || ''}
                onChangeText={(v: string) => handleChange('serving_unit', v)}
                style={styles.input}
                placeholder="e.g. muffin, g, oz"
                placeholderTextColor="#b0b0b0"
              />
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={isSaving}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonLabel}
            contentStyle={styles.buttonContent}
          >
            Save to Log
          </Button>
          <Button
            mode="text"
            onPress={() => onClose(false)}
            style={styles.textButton}
            labelStyle={styles.textButtonLabel}
            contentStyle={styles.buttonContent}
          >
            Cancel
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const muiPrimary = '#1976d2';
const muiPrimaryDark = '#115293';
const muiGray = '#f5f5f5';
const muiShadow = 'rgba(25, 118, 210, 0.08)';

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: muiShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: muiGray,
    padding: 16,
    minWidth: '100%',
    minHeight: '100%',
  },
  inputGroup: {
    marginBottom: 14,
    width: '100%',
  },
  label: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    fontSize: 16,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 4,
  },
  primaryButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: muiPrimary,
    borderRadius: 6,
  },
  primaryButtonLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outlinedButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: muiPrimary,
    borderRadius: 6,
  },
  outlinedButtonLabel: {
    color: muiPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  textButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 6,
  },
  textButtonLabel: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonContent: {
    height: 44,
  },
});

export default EditFoodForLogModal;