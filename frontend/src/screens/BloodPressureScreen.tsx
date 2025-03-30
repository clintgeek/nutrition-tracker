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
} from 'react-native';
import { format, subDays, subMonths } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import bloodPressureService, { BloodPressureLog } from '../services/bloodPressureService';
import BloodPressureForm from '../components/BloodPressureForm';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { BloodPressureImportButton } from '../components/BloodPressureImportButton';

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
  const [chartData, setChartData] = useState<{
    labels: string[];
    systolic: number[];
    diastolic: number[];
  }>({ labels: [], systolic: [], diastolic: [] });
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('7D');

  const navigation = useNavigation();

  const getChartData = useCallback((logs: BloodPressureLog[], span: TimeSpan) => {
    let filteredLogs = [...logs];
    const now = new Date();

    console.log('Getting chart data:', {
      totalLogs: logs.length,
      span,
      oldestLog: logs.length > 0 ? logs[logs.length - 1].log_date : 'none',
      newestLog: logs.length > 0 ? logs[0].log_date : 'none'
    });

    // Sort logs by date (newest first)
    filteredLogs.sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime());

    const cutoffDate = new Date();
    switch (span) {
      case '7D':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case '3M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      case '6M':
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        break;
      case '1Y':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      case 'ALL':
        // Set to a date far in the past
        cutoffDate.setFullYear(2000);
        break;
    }

    // Filter logs after cutoff date
    filteredLogs = filteredLogs.filter(log => {
      const logDate = new Date(log.log_date);
      const isAfterCutoff = logDate >= cutoffDate;
      if (!isAfterCutoff) {
        console.log('Filtering out log:', {
          logDate: log.log_date,
          cutoffDate: cutoffDate.toISOString().split('T')[0]
        });
      }
      return isAfterCutoff;
    });

    console.log('Filtered logs:', {
      span,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
      filteredCount: filteredLogs.length
    });

    // For longer time spans, we'll show fewer points to avoid overcrowding
    let maxPoints = 30;
    switch (span) {
      case '7D':
        maxPoints = 30;  // Show all points for 7 days
        break;
      case '1M':
        maxPoints = 40;  // Show more points for 1 month
        break;
      case '3M':
        maxPoints = 50;  // Show even more for 3 months
        break;
      case '6M':
      case '1Y':
      case 'ALL':
        maxPoints = 60;  // Show most points for longer spans
        break;
    }

    // Take the most recent logs first (already sorted newest to oldest)
    const recentLogs = filteredLogs.slice(0, maxPoints).reverse(); // Reverse to get oldest to newest

    if (recentLogs.length > 0) {
      // Format dates based on time span
      const formatDate = (date: Date) => {
        switch (span) {
          case '7D':
            return format(date, 'MM/dd HH:mm');
          case '1M':
            return format(date, 'MM/dd');
          case '3M':
          case '6M':
          case '1Y':
          case 'ALL':
            return format(date, 'MM/dd');
          default:
            return format(date, 'MM/dd');
        }
      };

      return {
        labels: recentLogs.map(log => formatDate(new Date(log.log_date))),
        systolic: recentLogs.map(log => log.systolic || 100),
        diastolic: recentLogs.map(log => log.diastolic || 60),
      };
    }

    return {
      labels: ['No Data'],
      systolic: [120],
      diastolic: [80],
    };
  }, []);

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
      setChartData(getChartData(fetchedLogs, timeSpan));
    } catch (error) {
      console.error('Error fetching blood pressure logs:', error);
      Alert.alert('Error', 'Failed to fetch blood pressure logs');
      setChartData({
        labels: ['No Data'],
        systolic: [120],
        diastolic: [80],
      });
    }
  }, [timeSpan, getChartData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

  const renderItem = ({ item }: { item: BloodPressureLog }) => (
    <View style={styles.logItem}>
      <TouchableOpacity
        style={styles.mainContent}
        onPress={() => {
          setSelectedLog(item);
          setShowForm(true);
        }}
      >
        <View style={styles.readingContainer}>
          <View style={styles.readings}>
            <Text style={styles.mainReading}>{item.systolic}</Text>
            <Text style={styles.separator}>/</Text>
            <Text style={styles.mainReading}>{item.diastolic}</Text>
            {item.pulse && (
              <>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.mainReading}>{item.pulse}</Text>
              </>
            )}
          </View>
          <Text style={styles.date}>{format(new Date(item.log_date), 'MMM dd, yyyy')}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          console.log('Delete button pressed for log:', item.id);
          handleDeleteLog(item);
        }}
        style={styles.deleteButton}
      >
        <Ionicons name="trash" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const hasData = logs.length > 0;

  return (
    <View style={styles.container}>
      {hasData ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  data: chartData.systolic,
                  color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`,
                  strokeWidth: 2,
                },
                {
                  data: chartData.diastolic,
                  color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
                  strokeWidth: 2,
                },
              ],
              legend: ['Systolic', 'Diastolic'],
            }}
            width={Dimensions.get('window').width - 32}
            height={260}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#fff',
              },
              propsForLabels: {
                fontSize: 10,
              },
              labelRotation: -45,
            }}
            withDots={true}
            withShadow={false}
            bezier
            style={{
              ...styles.chart,
              paddingBottom: 15,
              paddingRight: 12,
            }}
            fromZero
            segments={4}
            horizontalLabelRotation={-45}
            yLabelsOffset={10}
          />
          <View style={styles.timeSpanSelector}>
            {(['7D', '1M', '3M', '6M', '1Y', 'ALL'] as TimeSpan[]).map((span) => (
              <TouchableOpacity
                key={span}
                style={[
                  styles.timeSpanButton,
                  timeSpan === span && styles.timeSpanButtonActive
                ]}
                onPress={() => {
                  setTimeSpan(span);
                  fetchLogs();  // Fetch new logs with the updated time span
                }}
              >
                <Text
                  style={[
                    styles.timeSpanText,
                    timeSpan === span && styles.timeSpanTextActive
                  ]}
                >
                  {span}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No blood pressure logs yet</Text>
          <Text style={styles.noDataSubtext}>Add your first log using the + button below</Text>
        </View>
      )}

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <View style={styles.bottomButtonContainer}>
        <BloodPressureImportButton
          onImportComplete={fetchLogs}
          existingLogs={logs}
        />
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          setSelectedLog(undefined);
          setShowForm(true);
        }}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chartContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
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
  noDataContainer: {
    backgroundColor: '#fff',
    padding: 32,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  bottomButtonContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding to account for the floating add button
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  timeSpanSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  timeSpanButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginHorizontal: 4,
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
    color: '#fff',
    fontWeight: '600',
  },
});

export default BloodPressureScreen;