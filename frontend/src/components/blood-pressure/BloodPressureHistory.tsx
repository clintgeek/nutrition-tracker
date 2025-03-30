import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Title, Divider, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { BloodPressureLog } from '../../services/bloodPressureService';
import * as Sharing from 'expo-sharing';

interface BloodPressureHistoryProps {
  logs: BloodPressureLog[];
  onLogDeleted: (id: string) => Promise<void>;
}

export function BloodPressureHistory({ logs, onLogDeleted }: BloodPressureHistoryProps) {
  const theme = useTheme();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<BloodPressureLog | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleDelete = async () => {
    if (!logToDelete?._id) return;

    try {
      await onLogDeleted(logToDelete._id);
      setShowDeleteDialog(false);
      setLogToDelete(null);
    } catch (error) {
      console.error('Error deleting blood pressure log:', error);
      Alert.alert('Error', 'Failed to delete blood pressure log');
    }
  };

  const generateReport = async () => {
    try {
      setIsGeneratingReport(true);
      const response = await fetch('/api/blood-pressure/report');
      const blob = await response.blob();
      await Sharing.shareAsync(URL.createObjectURL(blob), {
        mimeType: 'application/pdf',
        dialogTitle: 'Blood Pressure Report',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const renderLogItem = ({ item }: { item: BloodPressureLog }) => (
    <View style={styles.logItem}>
      <View style={styles.logItemMain}>
        <Text style={styles.logItemReading}>
          {item.systolic}/{item.diastolic}
          {item.pulse ? ` • ${item.pulse} bpm` : ''}
        </Text>
        <Text style={styles.logItemDate}>
          {format(new Date(item.log_date), 'MMM d, yyyy')}
        </Text>
      </View>
      {item.notes && <Text style={styles.logItemNotes}>{item.notes}</Text>}
      <TouchableOpacity
        onPress={() => {
          setLogToDelete(item);
          setShowDeleteDialog(true);
        }}
        style={styles.deleteButton}
      >
        <MaterialCommunityIcons name="delete" size={24} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      margin: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    logItem: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      marginBottom: 8,
    },
    logItemMain: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    logItemReading: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
    },
    logItemDate: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    logItemNotes: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
      marginTop: 4,
    },
    deleteButton: {
      position: 'absolute',
      right: 8,
      top: 8,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <Title style={styles.title}>History</Title>
          <Button
            mode="outlined"
            onPress={generateReport}
            loading={isGeneratingReport}
            icon="file-pdf"
          >
            Generate Report
          </Button>
        </View>

        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="heart-pulse"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={styles.emptyStateText}>
              No blood pressure readings recorded yet.
            </Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item._id}
            ItemSeparatorComponent={() => <Divider style={{ marginVertical: 8 }} />}
          />
        )}

        <Portal>
          <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
            <Dialog.Title>Delete Reading</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to delete this blood pressure reading?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button onPress={handleDelete} textColor={theme.colors.error}>
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Card.Content>
    </Card>
  );
}