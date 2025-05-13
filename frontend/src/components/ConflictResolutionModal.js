import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { format, parseISO } from 'date-fns';
import offlineStorage from '../utils/offlineStorage';

const ConflictResolutionModal = ({ visible, onClose }) => {
  const [conflicts, setConflicts] = useState([]);
  const [selectedConflict, setSelectedConflict] = useState(null);

  useEffect(() => {
    if (visible) {
      loadConflicts();
    }
  }, [visible]);

  const loadConflicts = async () => {
    const pendingConflicts = await offlineStorage.getConflicts();
    setConflicts(pendingConflicts);
    if (pendingConflicts.length > 0) {
      setSelectedConflict(pendingConflicts[0]);
    }
  };

  const handleResolution = async (resolution) => {
    if (selectedConflict) {
      await offlineStorage.resolveConflict(selectedConflict.id, resolution);
      await loadConflicts(); // Reload remaining conflicts

      if (conflicts.length <= 1) {
        onClose(); // Close modal if no more conflicts
      }
    }
  };

  const renderConflictDetails = (conflict) => {
    if (!conflict) return null;

    const { action, localTimestamp, serverData } = conflict;
    const localTime = format(parseISO(localTimestamp), 'PPpp');
    const serverTime = serverData?.timestamp
      ? format(parseISO(serverData.timestamp), 'PPpp')
      : 'N/A';

    const renderDataComparison = () => {
      if (action === 'weight-logs') {
        return (
          <View style={styles.dataComparison}>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Local Data ({localTime})</Text>
              <Text style={styles.dataValue}>Weight: {conflict.data.weight} {conflict.data.unit}</Text>
              {conflict.data.notes && (
                <Text style={styles.dataNotes}>Notes: {conflict.data.notes}</Text>
              )}
            </View>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Server Data ({serverTime})</Text>
              <Text style={styles.dataValue}>Weight: {serverData.weight} {serverData.unit}</Text>
              {serverData.notes && (
                <Text style={styles.dataNotes}>Notes: {serverData.notes}</Text>
              )}
            </View>
          </View>
        );
      } else if (action === 'bp-logs') {
        return (
          <View style={styles.dataComparison}>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Local Data ({localTime})</Text>
              <Text style={styles.dataValue}>
                BP: {conflict.data.systolic}/{conflict.data.diastolic}
              </Text>
              <Text style={styles.dataValue}>Pulse: {conflict.data.pulse}</Text>
              {conflict.data.notes && (
                <Text style={styles.dataNotes}>Notes: {conflict.data.notes}</Text>
              )}
            </View>
            <View style={styles.dataColumn}>
              <Text style={styles.dataLabel}>Server Data ({serverTime})</Text>
              <Text style={styles.dataValue}>
                BP: {serverData.systolic}/{serverData.diastolic}
              </Text>
              <Text style={styles.dataValue}>Pulse: {serverData.pulse}</Text>
              {serverData.notes && (
                <Text style={styles.dataNotes}>Notes: {serverData.notes}</Text>
              )}
            </View>
          </View>
        );
      }
      return null;
    };

    return (
      <View style={styles.conflictDetails}>
        <Text style={styles.conflictTitle}>
          Data Conflict Detected
        </Text>
        <Text style={styles.conflictSubtitle}>
          There are conflicting entries for the same date. Please choose which data to keep:
        </Text>
        {renderDataComparison()}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Resolve Conflicts</Text>

          {conflicts.length === 0 ? (
            <Text style={styles.noConflicts}>No conflicts to resolve</Text>
          ) : (
            <>
              {renderConflictDetails(selectedConflict)}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.keepLocalButton]}
                  onPress={() => handleResolution('useLocal')}
                >
                  <Text style={styles.buttonText}>Keep Local Data</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.keepServerButton]}
                  onPress={() => handleResolution('useServer')}
                >
                  <Text style={styles.buttonText}>Use Server Data</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  noConflicts: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 20,
  },
  conflictDetails: {
    marginBottom: 20,
  },
  conflictTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E53935',
    marginBottom: 10,
  },
  conflictSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  dataComparison: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dataColumn: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginHorizontal: 5,
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dataValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  dataNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  keepLocalButton: {
    backgroundColor: '#4CAF50',
  },
  keepServerButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default ConflictResolutionModal;