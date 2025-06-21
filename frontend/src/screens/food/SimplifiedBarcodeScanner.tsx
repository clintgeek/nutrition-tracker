import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Dimensions, Vibration, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Text, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { foodService } from '../../services/foodService';
import { loggingService } from '../../services/loggingService';
import { validateBarcode } from '../../utils/validation';
import { useSafeAreaInsets } from '../../utils/safeArea';
import { TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SCAN_AREA_SIZE = Math.min(Dimensions.get('window').width * 0.8, 300);

// Simplified barcode scanner that always uses ZXing
export default function SimplifiedBarcodeScanner() {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasScriptLoaded, setHasScriptLoaded] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<any>(null);
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // Load ZXing script dynamically
  useEffect(() => {
    const loadZXingScript = async () => {
      if (!hasScriptLoaded && Platform.OS === 'web') {
        try {
          // Check if ZXing is already loaded
          if (!(window as any).ZXing) {
            // Create script element for ZXing
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js';
            script.async = true;

            // Wait for script to load
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });
          }

          setHasScriptLoaded(true);
        } catch (err) {
          setError('Failed to load barcode scanner library. Please try again or use manual entry.');
          setShowErrorDialog(true);
        }
      }
    };

    loadZXingScript();

    // Cleanup function
    return () => {
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch (e) {
          console.error('Error resetting code reader:', e);
        }
      }
    };
  }, []);

  // Initialize scanner when script is loaded
  useEffect(() => {
    const initializeScanner = async () => {
      if (hasScriptLoaded && !hasInitialized && Platform.OS === 'web') {
        try {
          // Initialize ZXing
          const { BrowserMultiFormatReader } = (window as any).ZXing;
          codeReaderRef.current = new BrowserMultiFormatReader();

          // Get available video devices
          const devices = await codeReaderRef.current.listVideoInputDevices();

          // Filter to only back cameras
          const backDevices = devices.filter((device: any) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear')
          );

          // Select a device - prioritize back camera
          if (backDevices.length > 0) {
            // Use the first back camera
            setSelectedDeviceId(backDevices[0].deviceId);
          } else if (devices.length > 0) {
            // If no back camera, use any available camera
            setSelectedDeviceId(devices[0].deviceId);
          }

          setHasInitialized(true);
        } catch (err) {
          setError('Failed to initialize barcode scanner. Please try again or use manual entry.');
          setShowErrorDialog(true);
        }
      }
    };

    initializeScanner();
  }, [hasScriptLoaded]);

  // Start scanner when device is selected
  useEffect(() => {
    if (hasInitialized && selectedDeviceId && !scannerStarted) {
      startScanner();
    }
  }, [hasInitialized, selectedDeviceId, scannerStarted]);

  const startScanner = async () => {
    if (!hasInitialized || !codeReaderRef.current || !selectedDeviceId || !videoRef.current) {
      return;
    }

    try {
      // Stop any existing scanner
      stopScanner();

      // Start continuous scanning
      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result: any, error: any) => {
          if (result && !scanned) {
            handleBarcodeDetected(result.getText());
          }

          if (error && !(error instanceof (window as any).ZXing.NotFoundException)) {
            // Silently handle normal scanning errors
          }
        }
      );

      setScannerStarted(true);
    } catch (err) {
      setError('Failed to start camera for barcode scanning. Please try again or use manual entry.');
      setShowErrorDialog(true);
    }
  };

  const stopScanner = () => {
    if (codeReaderRef.current && scannerStarted) {
      try {
        codeReaderRef.current.reset();
        setScannerStarted(false);
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
  };

  const handleBarcodeDetected = async (code: string) => {
    try {
      // Don't process the same code twice in a row
      if (scanned || code === lastScannedCode) {
        return;
      }

      setScanned(true);
      setLastScannedCode(code);

      // Provide haptic feedback if possible
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      } else {
        Vibration.vibrate(50);
      }

      // Validate barcode format
      const validation = validateBarcode(code);
      if (!validation.isValid) {
        throw new Error(`Invalid barcode: ${validation.error}`);
      }

      // Lookup the food
      setIsLoading(true);
      const food = await foodService.getFoodByBarcode(code);

      // Get route params from the navigation
      const navigationState = navigation.getState();
      const routes = navigationState.routes;
      const currentRoute = routes[routes.length - 1];
      const { mealType, date, fromLog } = currentRoute.params || {};

      // Navigate back to food screen with the scanned food
      stopScanner();

      // Navigate differently based on where we came from
      if (fromLog) {
        // If coming from the log screen, preserve that context
        console.log(`Navigation from log - params: mealType=${mealType}, date=${date}, fromLog=${fromLog}`);

        navigation.navigate('Food', {
          screen: 'FoodScreen',
          params: {
            scannedFood: food,
            mealType,
            date,
            fromLog: true
          }
        });
      } else {
        // Regular navigation to Food screen
        console.log(`Regular navigation to Food screen with scanned food`);
        navigation.navigate('Food', {
          screen: 'FoodScreen',
          params: {
            scannedFood: food
          }
        });
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setScanned(false);
      let errorMessage = 'Could not find food with this barcode. Please try again or add the food manually.';

      if (error instanceof Error) {
        if (error.message.includes('Invalid barcode')) {
          errorMessage = error.message;
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }

      setError(errorMessage);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBarcodeSubmit = async () => {
    try {
      if (!manualBarcode.trim()) {
        setError('Please enter a barcode');
        setShowErrorDialog(true);
        return;
      }

      setShowManualInput(false);
      setIsLoading(true);
      setError(null);

      // Validate barcode format
      const validation = validateBarcode(manualBarcode);
      if (!validation.isValid) {
        throw new Error(`Invalid barcode: ${validation.error}`);
      }

      // Look up the food by barcode
      const food = await foodService.getFoodByBarcode(manualBarcode);

      // Get route params from the navigation
      const navigationState = navigation.getState();
      const routes = navigationState.routes;
      const currentRoute = routes[routes.length - 1];
      const { mealType, date, fromLog } = currentRoute.params || {};

      // Navigate back to food screen with the scanned food
      stopScanner();

      // Navigate differently based on where we came from
      if (fromLog) {
        // If coming from the log screen, preserve that context
        console.log(`Manual barcode - Navigation from log - params: mealType=${mealType}, date=${date}, fromLog=${fromLog}`);

        navigation.navigate('Food', {
          screen: 'FoodScreen',
          params: {
            scannedFood: food,
            mealType,
            date,
            fromLog: true
          }
        });
      } else {
        // Regular navigation to Food screen
        console.log(`Manual barcode - Regular navigation to Food screen with scanned food`);
        navigation.navigate('Food', {
          screen: 'FoodScreen',
          params: {
            scannedFood: food
          }
        });
      }
    } catch (error) {
      console.error('Error looking up barcode:', error);
      let errorMessage = 'Could not find food with this barcode. Please try again or add the food manually.';

      if (error instanceof Error) {
        if (error.message.includes('Invalid barcode')) {
          errorMessage = error.message;
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }

      setError(errorMessage);
      setShowErrorDialog(true);
    } finally {
      setIsLoading(false);
      setManualBarcode('');
    }
  };

  // Web-specific rendering for scanner view
  const renderScanner = () => {
    if (Platform.OS !== 'web') {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>This scanner is only available on web platforms.</Text>
        </View>
      );
    }

    return (
      <View style={styles.scannerContainer}>
        {/* Video element for ZXing */}
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            maxHeight: SCAN_AREA_SIZE * 1.5,
          }}
        />
        <View style={styles.scanArea}>
          <View style={[styles.scanAreaCorner, styles.cornerTopLeft]} />
          <View style={[styles.scanAreaCorner, styles.cornerTopRight]} />
          <View style={[styles.scanAreaCorner, styles.cornerBottomLeft]} />
          <View style={[styles.scanAreaCorner, styles.cornerBottomRight]} />
        </View>
        <Text style={styles.instructions}>
          Position a barcode in the center of the screen
        </Text>
      </View>
    );
  };

  useEffect(() => {
    // Log navigation state for debugging
    const navigationState = navigation.getState();
    const routes = navigationState.routes;
    const currentRoute = routes[routes.length - 1];

    console.log("SimplifiedBarcodeScanner - Navigation State:",
      JSON.stringify({
        currentScreen: currentRoute.name,
        params: currentRoute.params || {},
        routesCount: routes.length,
        parentNavigator: navigation.getParent()?.getId() || 'none'
      }, null, 2)
    );
  }, []);

  useEffect(() => {
    // Focus the input when component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
  }, []);

  const handleScan = async () => {
    if (!barcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode');
      return;
    }

    setIsScanning(true);

    try {
      // Log the scan attempt
      loggingService.info('Manual barcode scan attempted', {
        barcode: barcode.trim(),
        scanner: 'simplified',
        platform: Platform.OS
      });

      // Navigate back with the barcode result
      navigation.goBack();

      // You might want to pass the barcode back to the previous screen
      // This would require setting up a callback or using navigation params

    } catch (error) {
      console.error('Error scanning barcode:', error);
      loggingService.error('Error in simplified barcode scanner', { error });
      Alert.alert('Error', 'Failed to process barcode');
    } finally {
      setIsScanning(false);
    }
  };

  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Manual Barcode Entry
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name="barcode-scan"
            size={80}
            color={theme.colors.primary}
          />
        </View>

        <Text style={[styles.instruction, { color: theme.colors.onSurface }]}>
          Enter the barcode number manually
        </Text>

        <TextInput
          ref={inputRef}
          style={[styles.input, { backgroundColor: theme.colors.surface }]}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Enter barcode number..."
          keyboardType="numeric"
          autoFocus={true}
          onSubmitEditing={handleScan}
          onKeyPress={handleKeyPress}
          maxLength={20}
        />

        <Button
          mode="contained"
          onPress={handleScan}
          loading={isScanning}
          disabled={!barcode.trim() || isScanning}
          style={styles.scanButton}
        >
          {isScanning ? 'Processing...' : 'Scan Barcode'}
        </Button>

        <Text style={[styles.note, { color: theme.colors.onSurfaceVariant }]}>
          This method works on all devices and browsers
        </Text>
      </View>

      {!hasInitialized && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scannerText}>Initializing scanner...</Text>
        </View>
      )}

      {/* Scanner view */}
      {renderScanner()}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scannerText}>Looking up food...</Text>
        </View>
      )}

      <View style={[styles.controls, { bottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={() => setShowManualInput(true)}
          style={styles.controlButton}
          icon="keyboard"
        >
          Enter Manually
        </Button>
        <Button
          mode="contained"
          onPress={() => {
            stopScanner();
            setTimeout(() => startScanner(), 500);
          }}
          style={styles.controlButton}
          icon="refresh"
        >
          Restart Scanner
        </Button>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.controlButton}
          icon="arrow-left"
        >
          Go Back
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <Text>{error}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showManualInput}
          onDismiss={() => {
            setShowManualInput(false);
            setManualBarcode('');
          }}
        >
          <Dialog.Title>Enter Barcode Manually</Dialog.Title>
          <Dialog.Content>
            <TextInput
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Enter barcode"
              keyboardType="number-pad"
              maxLength={13}
              style={styles.manualInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowManualInput(false);
              setManualBarcode('');
            }}>Cancel</Button>
            <Button onPress={handleManualBarcodeSubmit}>Submit</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  instruction: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 56,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    borderRadius: 8,
  },
  scanButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
    position: 'absolute',
  },
  scanAreaCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructions: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    position: 'absolute',
    bottom: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scannerText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
  },
  controls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  controlButton: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  manualInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    paddingHorizontal: 8,
    marginTop: 8,
  },
});