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
  ScrollView,
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
import { useFocusEffect } from '@react-navigation/native';

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
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('3M');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showPdfTooltip, setShowPdfTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'log'>('trends');

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
          startDate = '1970-01-01';
          break;
      }

      const endDate = format(now, 'yyyy-MM-dd');
      const fetchedLogs = await bloodPressureService.getBloodPressureLogs(startDate, endDate);

      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Error fetching blood pressure logs:', error);
      Alert.alert('Error', 'Failed to fetch blood pressure logs');
    }
  }, [timeSpan]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  useEffect(() => {
    const checkPdfTooltipStatus = async () => {
      try {
        const hasSeenTooltip = await AsyncStorage.getItem('hasSeenPdfTooltip');

        if (hasSeenTooltip !== 'true' && logs.length > 0) {
          setShowPdfTooltip(true);
          await AsyncStorage.setItem('hasSeenPdfTooltip', 'true');
          setTimeout(() => {
            setShowPdfTooltip(false);
          }, 8000);
        }
      } catch (error) {
        console.error('Error checking PDF tooltip status:', error);
      }
    };

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
    const confirmed = window.confirm('Are you sure you want to delete this blood pressure log?');
    if (confirmed) {
      try {
        await bloodPressureService.deleteBloodPressureLog(log.id);

        setLogs(prevLogs => {
          return prevLogs.filter(l => l.id !== log.id);
        });

        setTimeout(() => {
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
          break;
      }

      const endDate = format(now, 'yyyy-MM-dd');

      const blob = await bloodPressureService.generateReport(startDate, endDate, timeSpan);

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

  const calculateStats = useCallback(() => {
    if (logs.length === 0) return null;

    const stats = {
      systolic: {
        avg: 0,
        min: Infinity,
        max: -Infinity
      },
      diastolic: {
        avg: 0,
        min: Infinity,
        max: -Infinity
      },
      pulse: {
        avg: 0,
        min: Infinity,
        max: -Infinity,
        count: 0
      }
    };

    logs.forEach(log => {
      // Systolic stats
      stats.systolic.avg += log.systolic;
      stats.systolic.min = Math.min(stats.systolic.min, log.systolic);
      stats.systolic.max = Math.max(stats.systolic.max, log.systolic);

      // Diastolic stats
      stats.diastolic.avg += log.diastolic;
      stats.diastolic.min = Math.min(stats.diastolic.min, log.diastolic);
      stats.diastolic.max = Math.max(stats.diastolic.max, log.diastolic);

      // Pulse stats (only if pulse exists)
      if (log.pulse) {
        stats.pulse.avg += log.pulse;
        stats.pulse.min = Math.min(stats.pulse.min, log.pulse);
        stats.pulse.max = Math.max(stats.pulse.max, log.pulse);
        stats.pulse.count++;
      }
    });

    // Calculate averages
    stats.systolic.avg = Math.round(stats.systolic.avg / logs.length);
    stats.diastolic.avg = Math.round(stats.diastolic.avg / logs.length);
    if (stats.pulse.count > 0) {
      stats.pulse.avg = Math.round(stats.pulse.avg / stats.pulse.count);
    }

    return stats;
  }, [logs]);

  const renderStatsRow = () => {
    const stats = calculateStats();
    if (!stats) return null;

    return (
      <View style={styles(theme).statsRow}>
        <View style={styles(theme).statItem}>
          <Text style={styles(theme).statLabel}>Systolic</Text>
          <Text style={styles(theme).statValue}>{stats.systolic.avg}</Text>
          <Text style={styles(theme).statRange}>
            {stats.systolic.min} - {stats.systolic.max}
          </Text>
        </View>
        <View style={styles(theme).statItem}>
          <Text style={styles(theme).statLabel}>Diastolic</Text>
          <Text style={styles(theme).statValue}>{stats.diastolic.avg}</Text>
          <Text style={styles(theme).statRange}>
            {stats.diastolic.min} - {stats.diastolic.max}
          </Text>
        </View>
        {stats.pulse.count > 0 && (
          <View style={styles(theme).statItem}>
            <Text style={styles(theme).statLabel}>Pulse</Text>
            <Text style={styles(theme).statValue}>{stats.pulse.avg}</Text>
            <Text style={styles(theme).statRange}>
              {stats.pulse.min} - {stats.pulse.max}
            </Text>
          </View>
        )}
      </View>
    );
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
          handleDeleteLog(item);
        }}
        style={styles(theme).deleteButton}
      >
        <Ionicons name="trash" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const hasData = logs.length > 0;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'trends':
        return (
          <ScrollView style={styles(theme).tabContent} contentContainerStyle={{ flexGrow: 1 }}>
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
              {hasData ? (
                <>
                  <NivoBloodPressureChart data={logs} timeSpan={timeSpan} />
                  {renderStatsRow()}
                </>
              ) : (
                <View style={styles(theme).noDataContainer}>
                  <Ionicons name="pulse" size={48} color="#666" />
                  <Text style={styles(theme).noDataText}>
                    No blood pressure readings for {timeSpan === '7D' ? 'the last 7 days' :
                      timeSpan === '1M' ? 'the last month' :
                      timeSpan === '3M' ? 'the last 3 months' :
                      timeSpan === '6M' ? 'the last 6 months' :
                      timeSpan === '1Y' ? 'the last year' :
                      'the selected period'}
                  </Text>
                  <Text style={styles(theme).noDataSubtext}>
                    Try selecting a different time range or add your first reading using the + button below
                  </Text>
                </View>
              )}
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
                      fetchLogs();
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
          </ScrollView>
        );
      case 'log':
        return (
          <View style={[styles(theme).tabContent, { flex: 1 }]}>
            <View style={styles(theme).logsCard}>
              <View style={styles(theme).logsHeader}>
                <Text style={styles(theme).sectionTitle}>Blood Pressure Logs</Text>
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
                style={{ flexGrow: 1 }}
              />
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles(theme).container}>
      <View style={styles(theme).tabBar}>
        <TouchableOpacity
          style={[styles(theme).tab, activeTab === 'trends' && styles(theme).activeTab]}
          onPress={() => setActiveTab('trends')}
        >
          <Text style={[styles(theme).tabText, activeTab === 'trends' && styles(theme).activeTabText]}>Trends</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(theme).tab, activeTab === 'log' && styles(theme).activeTab]}
          onPress={() => setActiveTab('log')}
        >
          <Text style={[styles(theme).tabText, activeTab === 'log' && styles(theme).activeTabText]}>Log</Text>
        </TouchableOpacity>
      </View>
      {renderTabContent()}
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
      <Portal>
        <Modal
          visible={generatingPDF}
          transparent={true}
          animationType="fade"
        >
          <View style={styles(theme).loadingModalContainer}>
            <View style={styles(theme).loadingModalContent}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  tabContent: {
    padding: 16,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  pdfButton: {
    backgroundColor: '#2196F3',
  },
  timeSpanSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  timeSpanButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  timeSpanButtonActive: {
    backgroundColor: '#2196F3',
  },
  timeSpanText: {
    color: '#666',
  },
  timeSpanTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    minHeight: 200,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  logsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  logsHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
  },
  listFooter: {
    marginTop: 16,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mainContent: {
    flex: 1,
  },
  readingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readings: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainReading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  separator: {
    marginHorizontal: 4,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 500,
  },
  loadingModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2196F3',
  },
  statRange: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default BloodPressureScreen;