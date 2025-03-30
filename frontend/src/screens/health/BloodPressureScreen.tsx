import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { BloodPressureLogForm } from '../../components/blood-pressure/BloodPressureLogForm';
import { BloodPressureHistory } from '../../components/blood-pressure/BloodPressureHistory';
import { useBloodPressureLogs } from '../../hooks/useBloodPressureLogs';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function BloodPressureScreen() {
  const theme = useTheme();
  const { logs, isLoading, error, addLog, deleteLog } = useBloodPressureLogs();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <BloodPressureLogForm onLogAdded={addLog} />
      <BloodPressureHistory logs={logs} onLogDeleted={deleteLog} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});