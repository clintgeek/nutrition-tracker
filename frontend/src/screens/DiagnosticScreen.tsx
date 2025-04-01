import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Button, Text, Card, Divider } from 'react-native-paper';
import * as Camera from 'expo-camera';
import * as BarCodeScanner from 'expo-barcode-scanner';
import { loggingService } from '../services/loggingService';

export default function DiagnosticScreen() {
  const [cameraPermission, setCameraPermission] = useState<string>('checking...');
  const [barcodePermission, setBarcodePermission] = useState<string>('checking...');
  const [deviceInfo, setDeviceInfo] = useState<string>('checking...');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [message, ...prev].slice(0, 20));
    console.log(message);
  };

  useEffect(() => {
    // Get device information
    const getDeviceInfo = async () => {
      try {
        const info = {
          platform: Platform.OS,
          version: Platform.Version,
          isTesting: !!Platform.isTesting,
          userAgent: navigator?.userAgent || 'not available',
        };
        setDeviceInfo(JSON.stringify(info, null, 2));
        addLog(`Device info collected: ${Platform.OS} ${Platform.Version}`);
      } catch (err) {
        const error = err as Error;
        setDeviceInfo(`Error getting device info: ${error.message}`);
        addLog(`Error getting device info: ${error.message}`);
      }
    };
    getDeviceInfo();
  }, []);

  const checkCameraPermission = async () => {
    try {
      addLog('Checking camera permission...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(`Camera permission status: ${status}`);
      addLog(`Camera permission status: ${status}`);

      // Log to server
      loggingService.info('Camera permission check', { status, platform: Platform.OS });
    } catch (err) {
      const error = err as Error;
      setCameraPermission(`Error checking camera permission: ${error.message}`);
      addLog(`Error checking camera permission: ${error.message}`);

      // Log error to server
      loggingService.error('Camera permission check error', {
        error: error.message,
        stack: error.stack,
        platform: Platform.OS
      });
    }
  };

  const checkBarcodePermission = async () => {
    try {
      addLog('Checking barcode scanner permission...');
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setBarcodePermission(`Barcode scanner permission status: ${status}`);
      addLog(`Barcode scanner permission status: ${status}`);

      // Log to server
      loggingService.info('Barcode permission check', { status, platform: Platform.OS });
    } catch (err) {
      const error = err as Error;
      setBarcodePermission(`Error checking barcode permission: ${error.message}`);
      addLog(`Error checking barcode permission: ${error.message}`);

      // Log error to server
      loggingService.error('Barcode permission check error', {
        error: error.message,
        stack: error.stack,
        platform: Platform.OS
      });
    }
  };

  const testCameraCreation = async () => {
    try {
      addLog('Testing camera creation...');

      // Create a simple camera element but don't render it
      const cameraType = Camera.CameraType.back;
      addLog(`Using camera type: ${cameraType}`);

      // Test camera API - fixed method name
      const isCameraAvailableResult = await Camera.requestCameraPermissionsAsync();
      addLog(`Camera permission status: ${isCameraAvailableResult.status}`);

      // Just check camera type since the other method doesn't exist
      addLog(`Camera type requested: ${Camera.CameraType.back}`);

      // Log to server
      loggingService.info('Camera creation test', {
        permissionStatus: isCameraAvailableResult.status,
        cameraType: Camera.CameraType.back,
        platform: Platform.OS
      });
    } catch (err) {
      const error = err as Error;
      addLog(`Error testing camera: ${error.message}`);

      // Log error to server
      loggingService.error('Camera test error', {
        error: error.message,
        stack: error.stack,
        platform: Platform.OS
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Camera Permission Diagnostics" />
        <Card.Content>
          <Button mode="contained" onPress={checkCameraPermission} style={styles.button}>
            Check Camera Permission
          </Button>
          <Text style={styles.infoText}>{cameraPermission}</Text>

          <Divider style={styles.divider} />

          <Button mode="contained" onPress={checkBarcodePermission} style={styles.button}>
            Check Barcode Permission
          </Button>
          <Text style={styles.infoText}>{barcodePermission}</Text>

          <Divider style={styles.divider} />

          <Button mode="contained" onPress={testCameraCreation} style={styles.button}>
            Test Camera API
          </Button>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Device Information:</Text>
          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceInfoText}>{deviceInfo}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Diagnostic Logs" />
        <Card.Content>
          <Button mode="outlined" onPress={clearLogs} style={styles.button}>
            Clear Logs
          </Button>
          <View style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  button: {
    marginVertical: 8,
  },
  infoText: {
    marginTop: 8,
    fontSize: 14,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deviceInfoContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  deviceInfoText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  logsContainer: {
    backgroundColor: '#222',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    maxHeight: 300,
  },
  logText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginBottom: 4,
  },
});