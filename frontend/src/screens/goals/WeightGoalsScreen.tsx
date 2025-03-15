import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput as RNTextInput, Alert, FlatList, Platform } from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Dialog,
  Portal,
  ProgressBar,
  Paragraph
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { LoadingSpinner, SkeletonLoader, SkeletonCard, LoadingOverlay } from '../../components/common';

// Conditionally import DateTimePicker based on platform
let DateTimePicker: any = () => null;
if (Platform.OS !== 'web') {
  // Import for native platforms
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

// Web-compatible DatePicker component
const WebDatePicker = ({ value, onChange, minimumDate, maximumDate }: any) => {
  const handleChange = (e: any) => {
    if (e.target.value) {
      const newDate = new Date(e.target.value);
      onChange({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
    }
  };

  // Format date for input value
  const dateValue = value ? format(value, 'yyyy-MM-dd') : '';

  // Format min/max dates if provided
  const minDate = minimumDate ? format(minimumDate, 'yyyy-MM-dd') : undefined;
  const maxDate = maximumDate ? format(maximumDate, 'yyyy-MM-dd') : undefined;

  return (
    <input
      type="date"
      value={dateValue}
      onChange={handleChange}
      min={minDate}
      max={maxDate}
      style={{
        padding: 10,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'solid',
        fontSize: 16,
      }}
    />
  );
};

import { weightService, WeightLog, WeightGoal } from '../../services/weightService';

const WeightGoalsScreen: React.FC = () => {
  const theme = useTheme();
  const isFocused = useIsFocused();

  // State for weight goal
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [showGoalForm, setShowGoalForm] = useState(false);

  // State for weight logs
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [logDate, setLogDate] = useState(new Date());
  const [showLogDatePicker, setShowLogDatePicker] = useState(false);
  const [notes, setNotes] = useState('');

  // State for UI
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<WeightLog | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load weight goal and logs when screen is focused
  useEffect(() => {
    if (isFocused) {
      loadWeightData();
    }
  }, [isFocused]);

  // Load weight goal and logs
  const loadWeightData = async () => {
    try {
      setLoading(true);

      // Load current weight goal
      const goal = await weightService.getWeightGoal();
      if (goal) {
        setWeightGoal(goal);
        setTargetWeight(goal.target_weight?.toString() || '');
        setStartWeight(goal.start_weight?.toString() || '');
        // Hide goal form when a goal exists
        setShowGoalForm(false);
      } else {
        // Show goal form when no goal exists
        setShowGoalForm(true);
      }

      // Load weight logs
      const logs = await weightService.getWeightLogs();
      setWeightLogs(logs);

      // Set current weight from most recent log if available
      if (logs.length > 0 && logs[0]?.weight_value) {
        const latestLog = logs[0]; // Logs are sorted newest first
        setCurrentWeight(latestLog.weight_value.toString());

        // If no start weight is set yet, use the latest log weight
        if (!startWeight && latestLog.weight_value) {
          setStartWeight(latestLog.weight_value.toString());
        }
      }
    } catch (error) {
      console.error('Error loading weight data:', error);
      Alert.alert('Error', 'Failed to load weight data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save weight goal
  const saveWeightGoal = async () => {
    try {
      setSaving(true);

      if (!targetWeight || parseFloat(targetWeight) <= 0) {
        Alert.alert('Error', 'Please enter a valid target weight.');
        return;
      }

      if (!startWeight || parseFloat(startWeight) <= 0) {
        Alert.alert('Error', 'Please enter a valid starting weight.');
        return;
      }

      const goalData: Omit<WeightGoal, 'id' | 'sync_id' | 'created_at' | 'updated_at'> = {
        target_weight: parseFloat(targetWeight),
        start_weight: parseFloat(startWeight),
        start_date: new Date().toISOString().split('T')[0],
        target_date: undefined, // Target date is removed
      };

      const newGoal = await weightService.saveWeightGoal(goalData);
      setWeightGoal(newGoal);
      setShowGoalForm(false); // Hide form after saving

      Alert.alert('Success', 'Weight goal saved successfully!');
    } catch (error) {
      console.error('Error saving weight goal:', error);
      Alert.alert('Error', 'Failed to save weight goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Add weight log
  const addWeightLog = async () => {
    try {
      setAddingLog(true);

      if (!currentWeight || parseFloat(currentWeight) <= 0) {
        Alert.alert('Error', 'Please enter a valid weight.');
        return;
      }

      const logData: Omit<WeightLog, 'id' | 'sync_id' | 'created_at' | 'updated_at'> = {
        weight_value: parseFloat(currentWeight),
        log_date: logDate.toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      };

      await weightService.addWeightLog(logData);

      // Reset form
      setNotes('');
      setLogDate(new Date());

      // Reload data
      await loadWeightData();

      Alert.alert('Success', 'Weight log added successfully!');
    } catch (error) {
      console.error('Error adding weight log:', error);
      Alert.alert('Error', 'Failed to add weight log. Please try again.');
    } finally {
      setAddingLog(false);
    }
  };

  // Delete weight log
  const deleteWeightLog = async () => {
    if (!logToDelete?.id) return;

    try {
      await weightService.deleteWeightLog(logToDelete.id);

      // Reload data
      await loadWeightData();

      setShowDeleteDialog(false);
      setLogToDelete(null);

      Alert.alert('Success', 'Weight log deleted successfully!');
    } catch (error) {
      console.error('Error deleting weight log:', error);
      Alert.alert('Error', 'Failed to delete weight log. Please try again.');
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!weightGoal || !weightLogs.length || !weightLogs[0]?.weight_value) return 0;
    if (!weightGoal.start_weight || !weightGoal.target_weight) return 0;

    const currentWeight = weightLogs[0].weight_value;
    const startWeight = weightGoal.start_weight;
    const targetWeight = weightGoal.target_weight;

    // If target is to lose weight
    if (targetWeight < startWeight) {
      const totalToLose = startWeight - targetWeight;
      if (totalToLose <= 0) return 0; // Avoid division by zero
      const lost = startWeight - currentWeight;
      return Math.min(Math.max(lost / totalToLose, 0), 1);
    }
    // If target is to gain weight
    else if (targetWeight > startWeight) {
      const totalToGain = targetWeight - startWeight;
      if (totalToGain <= 0) return 0; // Avoid division by zero
      const gained = currentWeight - startWeight;
      return Math.min(Math.max(gained / totalToGain, 0), 1);
    }
    // If target is same as start (maintain)
    return 1;
  };

  // Render weight log item
  const renderWeightLogItem = ({ item }: { item: WeightLog }) => {
    // Validate date before formatting
    let formattedDate = '';
    try {
      if (item.log_date) {
        const dateObj = new Date(item.log_date);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = format(dateObj, 'MMM d, yyyy');
        } else {
          formattedDate = 'Invalid date';
        }
      } else {
        formattedDate = 'No date';
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      formattedDate = 'Invalid date';
    }

    return (
      <View style={styles.logItem}>
        <View style={styles.logItemMain}>
          <Text style={styles.logItemWeight}>{item.weight_value ? `${item.weight_value} lbs` : 'No weight'}</Text>
          <Text style={styles.logItemDate}>{formattedDate}</Text>
        </View>
        {item.notes && <Text style={styles.logItemNotes}>{item.notes}</Text>}
        <TouchableOpacity
          onPress={() => {
            setLogToDelete(item);
            setShowDeleteDialog(true);
          }}
          style={styles.deleteButton}
        >
          <MaterialCommunityIcons name="delete" size={24} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  // Render date picker based on platform
  const renderDatePicker = (
    showPicker: boolean,
    currentDate: Date,
    onDateChange: (event: any, date?: Date) => void,
    minimumDate?: Date,
    maximumDate?: Date
  ) => {
    if (Platform.OS === 'web') {
      // Always show the web date picker
      return (
        <WebDatePicker
          value={currentDate}
          onChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      );
    } else if (showPicker) {
      // Show native date picker only when requested
      return (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      );
    }
    return null;
  };

  // Add LoadingOverlay for saving and adding operations
  const renderLoadingOverlays = () => (
    <>
      <LoadingOverlay
        visible={saving}
        message="Saving weight goal..."
      />
      <LoadingOverlay
        visible={addingLog}
        message="Adding weight log..."
      />
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonCard style={styles.card} />
        <SkeletonCard style={styles.card} />
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Loading weight data..." />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Progress Section */}
        {weightGoal && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Weight Goal Progress</Title>
              <View style={styles.goalInfoRow}>
                <View style={styles.goalInfoItem}>
                  <Text style={styles.goalInfoLabel}>Start</Text>
                  <Text style={styles.goalInfoValue}>
                    {weightGoal.start_weight ? `${weightGoal.start_weight} lbs` : 'Not set'}
                  </Text>
                </View>
                <View style={styles.goalInfoItem}>
                  <Text style={styles.goalInfoLabel}>Current</Text>
                  <Text style={styles.goalInfoValue}>
                    {weightLogs.length > 0 && weightLogs[0]?.weight_value
                      ? `${weightLogs[0].weight_value} lbs`
                      : 'Not logged'}
                  </Text>
                </View>
                <View style={styles.goalInfoItem}>
                  <Text style={styles.goalInfoLabel}>Target</Text>
                  <Text style={styles.goalInfoValue}>
                    {weightGoal.target_weight ? `${weightGoal.target_weight} lbs` : 'Not set'}
                  </Text>
                </View>
              </View>
              <ProgressBar
                progress={calculateProgress()}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                <Text style={styles.progressPercentage}>{Math.round(calculateProgress() * 100)}%</Text> Complete
              </Text>
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button mode="text" onPress={() => setShowGoalForm(true)}>
                Edit Goal
              </Button>
            </Card.Actions>
          </Card>
        )}

        {/* Set Goal Section - Only show if no goal exists or user clicked Change Goal */}
        {(!weightGoal || showGoalForm) && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>
                {weightGoal ? 'Change Weight Goal' : 'Set Weight Goal'}
              </Title>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Starting Weight</Text>
                <RNTextInput
                  style={styles.input}
                  value={startWeight}
                  onChangeText={setStartWeight}
                  keyboardType="numeric"
                  placeholder="Enter your current weight"
                />
                <Text style={styles.inputUnit}>lbs</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Target Weight</Text>
                <RNTextInput
                  style={styles.input}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="numeric"
                  placeholder="Enter target weight"
                />
                <Text style={styles.inputUnit}>lbs</Text>
              </View>

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={saveWeightGoal}
                  style={styles.button}
                  disabled={saving || !targetWeight || !startWeight}
                  loading={saving}
                >
                  Save Goal
                </Button>
                {weightGoal && (
                  <Button
                    mode="outlined"
                    onPress={() => setShowGoalForm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Log Weight Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Log Your Weight</Title>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Weight</Text>
              <RNTextInput
                style={styles.input}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
                placeholder="Enter your current weight"
              />
              <Text style={styles.inputUnit}>lbs</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date</Text>
              {Platform.OS === 'web' ? (
                // Web date picker is always visible
                renderDatePicker(
                  true,
                  logDate,
                  (event, selectedDate) => {
                    if (selectedDate) {
                      setLogDate(selectedDate);
                    }
                  },
                  undefined,
                  new Date()
                )
              ) : (
                // Native platforms use a button to show the picker
                <>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowLogDatePicker(true)}
                  >
                    <Text>{format(logDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                  {showLogDatePicker && renderDatePicker(
                    true,
                    logDate,
                    (event, selectedDate) => {
                      setShowLogDatePicker(false);
                      if (selectedDate) {
                        setLogDate(selectedDate);
                      }
                    },
                    undefined,
                    new Date()
                  )}
                </>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <RNTextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this weight entry"
                multiline
              />
            </View>

            <Button
              mode="contained"
              onPress={addWeightLog}
              style={styles.button}
              disabled={addingLog || !currentWeight}
              loading={addingLog}
            >
              Add Weight Log
            </Button>
          </Card.Content>
        </Card>

        {/* Weight Logs Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Weight History</Title>
            {weightLogs.length === 0 ? (
              <Text style={styles.emptyText}>No weight logs yet. Add your first log above.</Text>
            ) : (
              <FlatList
                data={weightLogs}
                renderItem={renderWeightLogItem}
                keyExtractor={(item) => item.id?.toString() || item.log_date}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
              />
            )}
          </Card.Content>
        </Card>
      </View>

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Weight Log</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete the weight log
              {logToDelete?.log_date ? (() => {
                try {
                  const dateObj = new Date(logToDelete.log_date);
                  if (!isNaN(dateObj.getTime())) {
                    return ` from ${format(dateObj, 'MMM d, yyyy')}`;
                  }
                  return '';
                } catch (error) {
                  return '';
                }
              })() : ''}?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={deleteWeightLog}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {renderLoadingOverlays()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 8,
  },
  description: {
    opacity: 0.7,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    width: 120,
    fontSize: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  inputUnit: {
    marginLeft: 8,
    width: 30,
  },
  dateInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  button: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: 8,
  },
  deleteButton: {
    margin: 0,
  },
  loadingText: {
    marginTop: 16,
  },
  goalInfo: {
    marginBottom: 16,
  },
  goalInfoText: {
    fontSize: 16,
    marginBottom: 4,
  },
  progressText: {
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  progressPercentage: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  changeGoalContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeGoalButton: {
    padding: 8,
  },
  changeGoalText: {
    fontSize: 16,
    color: '#2196F3',
    textDecorationLine: 'underline',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    marginLeft: 8,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
  divider: {
    marginVertical: 8,
  },
  logItem: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logItemMain: {
    flex: 1,
  },
  logItemWeight: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logItemDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  logItemNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    flex: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalInfoItem: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  goalInfoLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  goalInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardActions: {
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

export default WeightGoalsScreen;