import React, { useState, useEffect, useCallback } from 'react';
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
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { LoadingSpinner, SkeletonLoader, SkeletonCard, LoadingOverlay } from '../../components/common';
import { weightService, WeightLog, WeightGoal } from '../../services/weightService';
import { WeightTrendGraph, WeightMetricsCard } from '../../components/dashboard';

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
      if (!isNaN(newDate.getTime())) {
        onChange({ type: 'set', nativeEvent: { timestamp: newDate.getTime() } }, newDate);
      }
    }
  };

  // Format date for input value with validation
  let dateValue = '';
  try {
    if (value && !isNaN(new Date(value).getTime())) {
      dateValue = format(new Date(value), 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
  }

  // Format min/max dates if provided
  let minDate = '';
  let maxDate = '';
  try {
    if (minimumDate && !isNaN(new Date(minimumDate).getTime())) {
      minDate = format(new Date(minimumDate), 'yyyy-MM-dd');
    }
    if (maximumDate && !isNaN(new Date(maximumDate).getTime())) {
      maxDate = format(new Date(maximumDate), 'yyyy-MM-dd');
    }
  } catch (error) {
    console.error('Error formatting min/max dates:', error);
  }

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

// Tab interface
interface Tab {
  key: string;
  title: string;
  icon: string;
}

const WeightGoalsScreen: React.FC = () => {
  const theme = useTheme();
  const isFocused = useIsFocused();

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const tabs: Tab[] = [
    { key: 'overview', title: 'Overview', icon: 'scale-bathroom' },
    { key: 'trends', title: 'Trends', icon: 'chart-line' },
    { key: 'log', title: 'Log', icon: 'format-list-bulleted' },
  ];

  // Weight goal state
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [targetDate, setTargetDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Weight log state
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
  useFocusEffect(
    useCallback(() => {
      loadWeightData();
    }, [])
  );

  // Load weight goal and logs
  const loadWeightData = async () => {
    try {
      setLoading(true);

      // Load current weight goal
      const goal = await weightService.getWeightGoal();
      if (goal) {
        setWeightGoal(goal);

        // Validate and set target weight
        const targetWeightValue = goal.target_weight?.toString() || '';
        setTargetWeight(targetWeightValue);

        // Validate and set start weight
        const startWeightValue = goal.start_weight?.toString() || '';
        setStartWeight(startWeightValue);

        // Validate and set start date
        try {
          if (goal.start_date) {
            const startDateObj = new Date(goal.start_date);
            if (!isNaN(startDateObj.getTime())) {
              setStartDate(startDateObj);
            } else {
              console.error('Invalid start date:', goal.start_date);
              setStartDate(new Date());
            }
          } else {
            setStartDate(new Date());
          }
        } catch (error) {
          console.error('Error parsing start date:', error);
          setStartDate(new Date());
        }

        // Validate and set target date
        try {
          if (goal.target_date) {
            const targetDateObj = new Date(goal.target_date);
            if (!isNaN(targetDateObj.getTime())) {
              setTargetDate(targetDateObj);
            } else {
              console.error('Invalid target date:', goal.target_date);
              const threeMonthsFromNow = new Date();
              threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
              setTargetDate(threeMonthsFromNow);
            }
          } else {
            const threeMonthsFromNow = new Date();
            threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
            setTargetDate(threeMonthsFromNow);
          }
        } catch (error) {
          console.error('Error parsing target date:', error);
          const threeMonthsFromNow = new Date();
          threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
          setTargetDate(threeMonthsFromNow);
        }

        setShowGoalForm(false);
      } else {
        setShowGoalForm(true);
      }

      // Load weight logs
      const logs = await weightService.getWeightLogs();
      setWeightLogs(logs);

      // Set current weight from most recent log if available
      if (logs.length > 0 && logs[0]?.weight_value) {
        const latestLog = logs[0];
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

  // Handle changing weight goal
  const handleChangeGoal = () => {
    if (weightGoal) {
      setTargetWeight(weightGoal.target_weight?.toString() || '');
      setStartWeight(weightGoal.start_weight?.toString() || '');
      setStartDate(new Date(weightGoal.start_date));
      if (weightGoal.target_date) {
        setTargetDate(new Date(weightGoal.target_date));
      }
    } else {
      setTargetWeight('');
      setStartWeight('');
      setStartDate(new Date());

      // Set target date to 3 months from now by default
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      setTargetDate(threeMonthsFromNow);
    }

    setShowGoalForm(true);
  };

  // Save weight goal
  const saveWeightGoal = async () => {
    try {
      setSaving(true);

      // Validate target weight
      const targetWeightNum = parseFloat(targetWeight);
      if (isNaN(targetWeightNum) || targetWeightNum <= 0 || targetWeightNum > 1000) {
        Alert.alert('Error', 'Please enter a valid target weight between 0 and 1000 lbs.');
        return;
      }

      // Validate start weight
      const startWeightNum = parseFloat(startWeight);
      if (isNaN(startWeightNum) || startWeightNum <= 0 || startWeightNum > 1000) {
        Alert.alert('Error', 'Please enter a valid starting weight between 0 and 1000 lbs.');
        return;
      }

      // Validate dates
      if (!startDate || isNaN(startDate.getTime())) {
        Alert.alert('Error', 'Please select a valid start date.');
        return;
      }

      if (!targetDate || isNaN(targetDate.getTime())) {
        Alert.alert('Error', 'Please select a valid target date.');
        return;
      }

      if (targetDate <= startDate) {
        Alert.alert('Error', 'Target date must be after start date.');
        return;
      }

      const goalData: Omit<WeightGoal, 'id' | 'sync_id' | 'created_at' | 'updated_at'> = {
        target_weight: targetWeightNum,
        start_weight: startWeightNum,
        start_date: format(startDate, 'yyyy-MM-dd'),
        target_date: format(targetDate, 'yyyy-MM-dd'),
      };

      const newGoal = await weightService.saveWeightGoal(goalData);
      setWeightGoal(newGoal);
      setShowGoalForm(false);

      Alert.alert('Success', 'Weight goal saved successfully!');
    } catch (error) {
      console.error('Error saving weight goal:', error);
      Alert.alert('Error', 'Failed to save weight goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Render log weight form
  const renderLogWeightForm = () => {
    return (
      <Card style={styles.logCard}>
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
              <WebDatePicker
                value={logDate}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setLogDate(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowLogDatePicker(true)}
                >
                  <Text>{format(logDate, 'MMM d, yyyy')}</Text>
                </TouchableOpacity>
                {showLogDatePicker && (
                  <DateTimePicker
                    value={logDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowLogDatePicker(false);
                      if (selectedDate) {
                        setLogDate(selectedDate);
                      }
                    }}
                    maximumDate={new Date()}
                  />
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
    );
  };

  // Add weight log
  const addWeightLog = async () => {
    try {
      setAddingLog(true);

      // Validate weight
      const weightValue = parseFloat(currentWeight);
      if (isNaN(weightValue) || weightValue <= 0 || weightValue > 1000) {
        Alert.alert('Error', 'Please enter a valid weight between 0 and 1000 lbs.');
        return;
      }

      // Validate date
      if (!logDate || isNaN(logDate.getTime())) {
        Alert.alert('Error', 'Please select a valid date.');
        return;
      }

      // Format date as YYYY-MM-DD
      const formattedDate = format(logDate, 'yyyy-MM-dd');

      const logData: Omit<WeightLog, 'id' | 'sync_id' | 'created_at' | 'updated_at'> = {
        weight_value: weightValue,
        log_date: formattedDate,
        notes: notes.trim() || undefined,
      };

      await weightService.addWeightLog(logData);

      // Reset form
      setNotes('');
      setLogDate(new Date());
      setCurrentWeight('');

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

    const currentWeight = parseFloat(weightLogs[0].weight_value?.toString() || '0');
    const startWeight = parseFloat(weightGoal.start_weight?.toString() || '0');
    const targetWeight = parseFloat(weightGoal.target_weight?.toString() || '0');

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

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'trends':
        return renderTrendsTab();
      case 'log':
        return renderLogTab();
      default:
        return renderOverviewTab();
    }
  };

  // Render overview tab
  const renderOverviewTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Weight Goal Progress */}
        {renderWeightGoalProgress()}

        {/* Weight Metrics */}
        {!loading && weightGoal && weightLogs.length > 0 && (
          <WeightMetricsCard
            weightGoal={weightGoal}
            weightLogs={weightLogs}
            isLoading={loading}
          />
        )}

        {/* Log Weight Form */}
        {renderLogWeightForm()}
      </View>
    );
  };

  // Render trends tab
  const renderTrendsTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Weight Trend Graph */}
        <WeightTrendGraph
          timeRange="goal"
          showActualWeight={true}
        />

        {/* Weight Metrics */}
        {!loading && weightGoal && weightLogs.length > 0 && (
          <WeightMetricsCard
            weightGoal={weightGoal}
            weightLogs={weightLogs}
            isLoading={loading}
          />
        )}
      </View>
    );
  };

  // Render log tab
  const renderLogTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Log Weight Form */}
        {renderLogWeightForm()}

        {/* Weight History */}
        {renderWeightHistory()}
      </View>
    );
  };

  // Render weight goal progress
  const renderWeightGoalProgress = () => {
    if (loading) {
      return (
        <Card style={styles.goalCard}>
          <Card.Content>
            <LoadingSpinner size={40} />
          </Card.Content>
        </Card>
      );
    }

    if (!weightGoal || showGoalForm) {
      return (
        <Card style={styles.goalCard}>
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <WebDatePicker
                  value={startDate}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setStartDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text>{format(startDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                  {showStartDatePicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowStartDatePicker(false);
                        if (selectedDate) {
                          setStartDate(selectedDate);
                        }
                      }}
                      maximumDate={new Date()}
                    />
                  )}
                </>
              )}
            </View>

            {/* Target Date field is hidden but we still save it */}
            <View style={{ display: 'none' }}>
              <Text style={styles.inputLabel}>Target Date</Text>
              {Platform.OS === 'web' ? (
                <WebDatePicker
                  value={targetDate}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTargetDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTargetDatePicker(true)}
                  >
                    <Text>{format(targetDate, 'MMM d, yyyy')}</Text>
                  </TouchableOpacity>
                  {showTargetDatePicker && (
                    <DateTimePicker
                      value={targetDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowTargetDatePicker(false);
                        if (selectedDate) {
                          setTargetDate(selectedDate);
                        }
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}
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
      );
    }

    // Calculate progress
    const progress = calculateProgress();
    const progressPercent = Math.round(progress * 100);

    // Get current weight from latest log
    const currentWeight = weightLogs.length > 0
      ? parseFloat(weightLogs[0].weight_value?.toString() || '0')
      : parseFloat(weightGoal?.start_weight?.toString() || '0');

    // Determine if goal is to lose or gain weight
    const startWeightNum = parseFloat(weightGoal?.start_weight?.toString() || '0');
    const targetWeightNum = parseFloat(weightGoal?.target_weight?.toString() || '0');
    const isLoseWeight = targetWeightNum < startWeightNum;
    const goalType = isLoseWeight ? 'lose' : 'gain';

    // Calculate weight change
    const totalChange = Math.abs(targetWeightNum - startWeightNum);
    const currentChange = Math.abs(currentWeight - startWeightNum);
    const remainingChange = Math.abs(targetWeightNum - currentWeight);

    return (
      <Card style={styles.goalCard}>
        <Card.Content>
          <View style={styles.goalHeader}>
            <View style={{flex: 1}}></View>
            <Button
              mode="text"
              onPress={handleChangeGoal}
              style={styles.changeGoalButton}
            >
              Change Goal
            </Button>
          </View>

          <View style={styles.weightValues}>
            <View style={styles.weightValue}>
              <Text style={styles.weightLabel}>Start</Text>
              <Text style={styles.weightNumber}>{parseFloat(weightGoal?.start_weight?.toString() || '0').toFixed(1)}</Text>
              <Text style={styles.weightUnit}>lbs</Text>
            </View>

            <View style={styles.weightValue}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightNumber}>{parseFloat(currentWeight?.toString() || '0').toFixed(1)}</Text>
              <Text style={styles.weightUnit}>lbs</Text>
            </View>

            <View style={styles.weightValue}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightNumber}>{parseFloat(weightGoal?.target_weight?.toString() || '0').toFixed(1)}</Text>
              <Text style={styles.weightUnit}>lbs</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
              testID="progress-bar"
            />
          </View>

          {/* <View style={styles.goalSummaryRow}>
            <Text style={styles.goalSummaryTextLeft}>
              Goal: {goalType === 'lose' ? 'Lose' : 'Gain'} {totalChange.toFixed(1)} lbs
            </Text>

            <Text style={styles.goalSummaryTextCenter}>
              {progressPercent}% Complete
            </Text>

            <Text style={styles.goalSummaryTextRight}>
              {currentChange.toFixed(1)} lbs {goalType === 'lose' ? 'lost' : 'gained'}, {remainingChange.toFixed(1)} lbs to go
            </Text>
          </View> */}
        </Card.Content>
      </Card>
    );
  };

  // Render weight history
  const renderWeightHistory = () => {
    if (loading) {
      return (
        <Card style={styles.historyCard}>
          <Card.Content>
            <LoadingSpinner size={40} />
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.historyCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Weight History</Title>

          {weightLogs.length === 0 ? (
            <Text style={styles.emptyText}>No weight logs yet. Add your first log above.</Text>
          ) : (
            <FlatList
              data={weightLogs}
              renderItem={renderWeightLogItem}
              keyExtractor={(item) => item.id?.toString() || item.log_date}
              style={styles.logList}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <Divider style={styles.divider} />}
            />
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonCard style={styles.cardStyle} />
        <SkeletonCard style={styles.cardStyle} />
        <View style={styles.loadingOverlay}>
          <LoadingSpinner message="Loading weight data..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon}
              size={24}
              color={activeTab === tab.key ? theme.colors.primary : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        {renderTabContent()}
      </ScrollView>

      {/* Loading Overlay */}
      {loading && <LoadingOverlay visible={loading} message="Loading weight data..." />}

      {/* Delete Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => setShowDeleteDialog(false)}
        >
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
            <Button onPress={deleteWeightLog} textColor={theme.colors.error}>Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  goalCard: {
    marginVertical: 8,
    elevation: 2,
    position: 'relative',
    zIndex: 1,
    backgroundColor: '#fff',
  },
  logCard: {
    marginBottom: 16,
    elevation: 2,
  },
  historyCard: {
    marginBottom: 16,
    elevation: 2,
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  progressContainer: {
    marginVertical: 16,
    position: 'relative',
    zIndex: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    zIndex: 1,
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
  weightValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weightValue: {
    alignItems: 'center',
    flex: 1,
  },
  weightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  weightNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  weightUnit: {
    fontSize: 12,
    color: '#666',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalDetailsContainer: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  goalText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'right',
  },
  progressDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  logList: {
    marginTop: 8,
  },
  cardStyle: {
    marginBottom: 16,
    elevation: 2,
  },
  goalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative',
    zIndex: 2,
  },
  goalSummaryTextLeft: {
    fontSize: 14,
    flex: 1,
    textAlign: 'left',
  },
  goalSummaryTextCenter: {
    fontSize: 14,
    flex: 1,
    textAlign: 'center',
  },
  goalSummaryTextRight: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
});

export default WeightGoalsScreen;