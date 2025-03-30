import React, { useState } from 'react';
import { View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import { Text, Button, useTheme, Card } from 'react-native-paper';
import { DatePickerInput } from 'react-native-paper-dates';
import { format } from 'date-fns';
import bloodPressureService, { BloodPressureLog } from '../../services/bloodPressureService';

interface BloodPressureLogFormProps {
  onLogAdded: (log: Omit<BloodPressureLog, '_id' | 'created_at' | 'updated_at'>) => Promise<BloodPressureLog>;
}

export function BloodPressureLogForm({ onLogAdded }: BloodPressureLogFormProps) {
  const theme = useTheme();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!systolic || !diastolic) {
      return;
    }

    try {
      setIsSubmitting(true);
      const logData = {
        systolic: parseInt(systolic),
        diastolic: parseInt(diastolic),
        pulse: pulse ? parseInt(pulse) : undefined,
        log_date: format(selectedDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
      };

      await onLogAdded(logData);

      // Reset form
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setNotes('');
      setSelectedDate(new Date());
    } catch (error) {
      console.error('Error adding blood pressure log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      margin: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    dateInput: {
      backgroundColor: theme.colors.surface,
    },
    notesInput: {
      height: 100,
      textAlignVertical: 'top',
    },
    button: {
      marginTop: 8,
    },
    row: {
      flexDirection: 'row',
      marginHorizontal: -4,
    },
    column: {
      flex: 1,
      marginHorizontal: 4,
    },
  });

  return (
    <Card style={styles.container}>
      <Card.Content>
        <Text style={styles.label}>Blood Pressure Reading</Text>
        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>Systolic</Text>
            <RNTextInput
              style={styles.input}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
              placeholder="120"
              maxLength={3}
            />
          </View>
          <View style={styles.column}>
            <Text style={styles.label}>Diastolic</Text>
            <RNTextInput
              style={styles.input}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
              placeholder="80"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pulse (Optional)</Text>
          <RNTextInput
            style={styles.input}
            value={pulse}
            onChangeText={setPulse}
            keyboardType="numeric"
            placeholder="72"
            maxLength={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <DatePickerInput
            locale="en"
            value={selectedDate}
            onChange={(d) => d && setSelectedDate(d)}
            inputMode="start"
            style={styles.dateInput}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <RNTextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this reading"
            multiline
            numberOfLines={4}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          disabled={isSubmitting || !systolic || !diastolic}
          loading={isSubmitting}
        >
          Add Reading
        </Button>
      </Card.Content>
    </Card>
  );
}