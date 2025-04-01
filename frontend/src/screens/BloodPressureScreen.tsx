import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { format, subDays, subMonths } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FAB, useTheme, Button, Portal } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bloodPressureService, { BloodPressureLog } from '../services/bloodPressureService';
import BloodPressureForm from '../components/BloodPressureForm';
import { BloodPressureImportButton } from '../components/BloodPressureImportButton';
import NivoBloodPressureChart from '../components/blood-pressure/NivoBloodPressureChart';

interface BloodPressureFormData {
  systolic: number;
  diastolic: number;
  pulse?: number;
  log_date: string;
  notes?: string;
}

type TimeSpan = '7D' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const BloodPressureScreen: React.FC = () => {
  const [logs, setLogs] = useState<BloodPressureLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BloodPressureLog | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('7D');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showPdfTooltip, setShowPdfTooltip] = useState(false);

  const navigation = useNavigation();
  const theme = useTheme();

  const fetchLogs = useCallback(async () => {
    try {
      const now = new Date();
      let startDate: string | undefined;

      switch (timeSpan) {
        case '7D':
          startDate = format(subDays(now, 7), 'yyyy-MM-dd');
          break;
        case '1M':
          startDate = format(subMonths(now, 1), 'yyyy-MM-dd');
          break;
        case '3M':
          startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
          break;
        case '6M':
          startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
          break;
        case '1Y':
          startDate = format(subMonths(now, 12), 'yyyy-MM-dd');
          break;
        case 'ALL':
          // For ALL, we'll fetch from the beginning of 2023
          startDate = '2023-01-01';
          break;
      }

      const endDate = format(now, 'yyyy-MM-dd');
      console.log('Fetching logs with date range:', { startDate, endDate });
      const fetchedLogs = await bloodPressureService.getBloodPressureLogs(startDate, endDate);
      console.log('Fetched logs:', {
        timeSpan,
        startDate,
        endDate,
        count: fetchedLogs.length,
        oldestLog: fetchedLogs.length > 0 ? fetchedLogs[fetchedLogs.length - 1].log_date : 'none',
        newestLog: fetchedLogs.length > 0 ? fetchedLogs[0].log_date : 'none'
      });

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching blood pressure logs:', error);
      Alert.alert('Error', 'Failed to fetch blood pressure logs');
    }
  }, [timeSpan]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const checkPdfTooltipStatus = async () => {
      try {
        const hasSeenTooltip = await AsyncStorage.getItem('hasSeenPdfTooltip');

        if (hasSeenTooltip !== 'true' && logs.length > 0) {
          // Only show tooltip if there's data and user hasn't seen it before
          setShowPdfTooltip(true);

          // Mark tooltip as seen
          await AsyncStorage.setItem('hasSeenPdfTooltip', 'true');

          // Auto-hide tooltip after 8 seconds
          setTimeout(() => {
            setShowPdfTooltip(false);
          }, 8000);
        }
      } catch (error) {
        console.error('Error checking PDF tooltip status:', error);
      }
    };

    // Check if we should show tooltip when logs are loaded
    if (logs.length > 0) {
      checkPdfTooltipStatus();
    }
  }, [logs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  const handleAddLog = async (logData: BloodPressureFormData) => {
    try {
      await bloodPressureService.addBloodPressureLog(logData);
      setShowForm(false);
      fetchLogs();
    } catch (error) {
      console.error('Error adding blood pressure log:', error);
      Alert.alert('Error', 'Failed to add blood pressure log');
    }
  };

  const handleUpdateLog = async (logData: BloodPressureFormData) => {
    try {
      if (selectedLog) {
        await bloodPressureService.updateBloodPressureLog(selectedLog.id, logData);
        setShowForm(false);
        setSelectedLog(undefined);
        fetchLogs();
      }
    } catch (error) {
      console.error('Error updating blood pressure log:', error);
      Alert.alert('Error', 'Failed to update blood pressure log');
    }
  };

  const handleDeleteLog = async (log: BloodPressureLog) => {
    console.log('handleDeleteLog called with log:', log.id);
    const confirmed = window.confirm('Are you sure you want to delete this blood pressure log?');
    if (confirmed) {
      try {
        console.log('Delete confirmed for log:', log.id);
        await bloodPressureService.deleteBloodPressureLog(log.id);
        console.log('Delete service call completed for log:', log.id);

        // Update local state first
        setLogs(prevLogs => {
          console.log('Updating logs state, removing log:', log.id);
          return prevLogs.filter(l => l.id !== log.id);
        });

        // Wait a bit before refreshing to avoid race condition
        setTimeout(() => {
          console.log('Refreshing logs after deletion');
          fetchLogs();
        }, 100);
      } catch (error) {
        console.error('Error deleting blood pressure log:', error);
        alert('Failed to delete blood pressure log');
      }
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);

      // Get date range based on current timeSpan
      const now = new Date();
      let startDate: string | undefined;

      switch (timeSpan) {
        case '7D':
          startDate = format(subDays(now, 7), 'yyyy-MM-dd');
          break;
        case '1M':
          startDate = format(subMonths(now, 1), 'yyyy-MM-dd');
          break;
        case '3M':
          startDate = format(subMonths(now, 3), 'yyyy-MM-dd');
          break;
        case '6M':
          startDate = format(subMonths(now, 6), 'yyyy-MM-dd');
          break;
        case '1Y':
          startDate = format(subMonths(now, 12), 'yyyy-MM-dd');
          break;
        case 'ALL':
          // For ALL, undefined will fetch all logs
          break;
      }

      const endDate = format(now, 'yyyy-MM-dd');

      // Generate PDF report with current timespan data
      const blob = await bloodPressureService.generateReport(startDate, endDate, timeSpan);

      // Download the PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `blood-pressure-report-${timeSpan}-${format(now, 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      Alert.alert('Success', 'Blood pressure report generated successfully');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      Alert.alert('Error', 'Failed to generate blood pressure report');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const renderItem = ({ item }: { item: BloodPressureLog }) => (
    <View style={styles(theme).logItem}>
      <TouchableOpacity
        style={styles(theme).mainContent}
        onPress={() => {
          setSelectedLog(item);
          setShowForm(true);
        }}
      >
        <View style={styles(theme).readingContainer}>
          <View style={styles(theme).readings}>
            <Text style={styles(theme).mainReading}>{item.systolic}</Text>
            <Text style={styles(theme).separator}>/</Text>
            <Text style={styles(theme).mainReading}>{item.diastolic}</Text>
            {item.pulse && (
              <>
                <Text style={styles(theme).separator}>•</Text>
                <Text style={styles(theme).mainReading}>{item.pulse}</Text>
              </>
            )}
          </View>
          <Text style={styles(theme).date}>{format(new Date(item.log_date), 'MMM dd, yyyy')}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          console.log('Delete button pressed for log:', item.id);
          handleDeleteLog(item);
        }}
        style={styles(theme).deleteButton}
      >
        <Ionicons name="trash" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const hasData = logs.length > 0;

  return (
    <View style={styles(theme).container}>
      {hasData ? (
        <View style={styles(theme).chartCard}>
          <View style={styles(theme).chartHeader}>
            <Text style={styles(theme).chartTitle}>Blood Pressure Trends</Text>
            {Platform.OS === 'web' && (
              <Button
                mode="contained"
                icon="file-pdf-box"
                onPress={handleGeneratePDF}
                loading={generatingPDF}
                disabled={generatingPDF || logs.length === 0}
                style={styles(theme).pdfButton}
              >
                Export PDF
              </Button>
            )}
          </View>
          <NivoBloodPressureChart data={logs} timeSpan={timeSpan} />
          <View style={styles(theme).timeSpanSelector}>
            {(['7D', '1M', '3M', '6M', '1Y', 'ALL'] as TimeSpan[]).map((span) => (
              <TouchableOpacity
                key={span}
                style={[
                  styles(theme).timeSpanButton,
                  timeSpan === span && styles(theme).timeSpanButtonActive
                ]}
                onPress={() => {
                  setTimeSpan(span);
                  fetchLogs();  // Fetch new logs with the updated time span
                }}
              >
                <Text
                  style={[
                    styles(theme).timeSpanText,
                    timeSpan === span && styles(theme).timeSpanTextActive
                  ]}
                >
                  {span}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles(theme).noDataCard}>
          <Text style={styles(theme).noDataText}>No blood pressure logs yet</Text>
          <Text style={styles(theme).noDataSubtext}>Add your first log using the + button below</Text>
        </View>
      )}

      <View style={styles(theme).logsCard}>
        <View style={styles(theme).logsHeader}>
          <Text style={styles(theme).sectionTitle}>Blood Pressure Logs</Text>
          {Platform.OS === 'web' && logs.length > 0 && (
            <Button
              mode="outlined"
              icon="file-pdf-box"
              onPress={handleGeneratePDF}
              loading={generatingPDF}
              disabled={generatingPDF}
              compact
              style={styles(theme).pdfButtonSmall}
            >
              PDF
            </Button>
          )}
        </View>
        <FlatList
          data={logs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles(theme).listContent}
          ListEmptyComponent={
            <Text style={styles(theme).emptyListText}>No logs to display for the selected time period</Text>
          }
          ListFooterComponent={
            <View style={styles(theme).listFooter}>
              <BloodPressureImportButton
                onImportComplete={fetchLogs}
                existingLogs={logs}
              />
            </View>
          }
        />
      </View>

      <FAB
        icon="plus"
        style={styles(theme).fab}
        onPress={() => {
          setSelectedLog(undefined);
          setShowForm(true);
        }}
        label="Add Reading"
        labelTextColor="white"
        theme={{ colors: { onSecondaryContainer: 'white' }}}
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles(theme).modalContainer}>
          <View style={styles(theme).modalContent}>
            <BloodPressureForm
              initialValues={selectedLog ? {
                ...selectedLog,
                pulse: selectedLog.pulse || undefined,
                notes: selectedLog.notes || undefined
              } : undefined}
              onSubmit={selectedLog ? handleUpdateLog : handleAddLog}
              onCancel={() => {
                setShowForm(false);
                setSelectedLog(undefined);
              }}
            />
          </View>
        </View>
      </Modal>

      {/* PDF Generation Loading Modal */}
      <Portal>
        <Modal
          visible={generatingPDF}
          transparent={true}
          animationType="fade"
        >
          <View style={styles(theme).loadingModalContainer}>
            <View style={styles(theme).loadingModalContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles(theme).loadingModalText}>
                Generating PDF report...
              </Text>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* PDF Feature Tooltip - Using custom tooltip instead of Snackbar */}
      {showPdfTooltip && Platform.OS === 'web' && (
        <View style={[styles(theme).customTooltip, { backgroundColor: theme.colors.primary }]}>
          <View style={styles(theme).tooltipContent}>
            <Ionicons name="information-circle" size={20} color="white" />
            <Text style={styles(theme).tooltipText}>
              NEW: You can now export your blood pressure data as a PDF report!
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPdfTooltip(false)}
            style={styles(theme).tooltipButton}
          >
            <Text style={styles(theme).tooltipButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    paddingBottom: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: 'white',
  },
  mainContent: {
    flex: 1,
  },
  readingContainer: {
    flexDirection: 'column',
  },
  readings: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainReading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  separator: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 16,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 80, // Increased to account for tab bar
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  noDataCard: {
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomButtonContainer: {
    marginBottom: 80, // Increased to account for tab bar and add button
  },
  timeSpanSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  timeSpanButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  timeSpanButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeSpanText: {
    fontSize: 14,
    color: '#666',
  },
  timeSpanTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20, // Added to provide space at the bottom of the list
  },
  listFooter: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 4, // Reduced to be closer to the tab bar
    backgroundColor: theme.colors.primary,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  pdfButton: {
    marginLeft: 'auto',
  },
  pdfButtonSmall: {
    marginLeft: 8,
    height: 36,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingModalText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  customTooltip: {
    position: 'absolute',
    bottom: 70, // Position above FAB
    left: 16,
    right: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    zIndex: 1000,
  },
  tooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tooltipText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
  },
  tooltipButton: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
  },
  tooltipButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default BloodPressureScreen;