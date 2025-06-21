import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Dimensions, Vibration, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/core';
import { ActivityIndicator, Text, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { foodService } from '../../services/foodService';
import { loggingService } from '../../services/loggingService';
import { validateBarcode } from '../../utils/validation';
import { useSafeAreaInsets } from '../../utils/safeArea';

const SCAN_AREA_SIZE = Math.min(Dimensions.get('window').width * 0.8, 300);

// This component is specifically designed for the PWA on Android using ZXing barcode scanning
export default function ZXingBarcodeScanner() {
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
  const [videoDevices, setVideoDevices] = useState<{deviceId: string, label: string}[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<any>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Load ZXing script dynamically
  useEffect(() => {
    const loadZXingScript = async () => {
      if (!hasScriptLoaded && Platform.OS === 'web') {
        try {
          // Check if ZXing is already loaded
          if (!(window as any).ZXing) {
            loggingService.info('Loading ZXing script');

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

            loggingService.info('ZXing script loaded successfully');
          }

          setHasScriptLoaded(true);
        } catch (err) {
          loggingService.error('Failed to load ZXing script', { error: err });
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

          // Filter to only back cameras if possible and select a device
          const backDevices = devices.filter((device: any) =>
            device.label.toLowerCase().includes('back') ||
            device.label.toLowerCase().includes('rear')
          );

          const availableDevices = devices.map((device: any) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId.substring(0, 5)}...`
          }));

          setVideoDevices(availableDevices);

          // Select a default device (prefer back camera)
          if (backDevices.length > 0) {
            setSelectedDeviceId(backDevices[0].deviceId);
          } else if (devices.length > 0) {
            setSelectedDeviceId(devices[0].deviceId);
          }

          setHasInitialized(true);
          loggingService.info('ZXing scanner initialized', {
            deviceCount: devices.length,
            backCameraCount: backDevices.length
          });
        } catch (err) {
          loggingService.error('Error initializing ZXing scanner', { error: err });
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
      loggingService.info('Starting ZXing scanner', { deviceId: selectedDeviceId });

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result: any, error: any) => {
          if (result && !scanned) {
            handleBarcodeDetected(result.getText());
          }

          if (error && !(error instanceof (window as any).ZXing.NotFoundException)) {
            loggingService.error('ZXing scanning error', { error });
          }
        }
      );

      setScannerStarted(true);
      loggingService.info('ZXing scanner started successfully');
    } catch (err) {
      loggingService.error('Failed to start ZXing scanner', { error: err });
      setError('Failed to start camera for barcode scanning. Please try again or use manual entry.');
      setShowErrorDialog(true);
    }
  };

  const stopScanner = () => {
    if (codeReaderRef.current && scannerStarted) {
      try {
        codeReaderRef.current.reset();
        setScannerStarted(false);
        loggingService.info('ZXing scanner stopped');
      } catch (e) {
        loggingService.error('Error stopping ZXing scanner', { error: e });
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

      console.log(`Barcode detected: ${code}. Searching for food...`);

      // Dump navigation state for debugging
      console.log(`Current navigation state:`, JSON.stringify(navigation.getState(), null, 2));

      // Route params debug - use useRoute hook that's already imported
      // If route is undefined, we can't access route.params
      const routeParams = route?.params || {};
      console.log(`Route params:`, JSON.stringify(routeParams, null, 2));

      // Lookup the food
      setIsLoading(true);
      const food = await foodService.getFoodByBarcode(code);

      // Check if food was found, if not create a placeholder
      let foodToUse;
      if (!food || !food.id) {
        console.log(`Could not find food with barcode ${code}, creating placeholder food`);
        foodToUse = {
          id: `temp-${Date.now()}`,
          name: `Food with barcode ${code}`,
          barcode: code,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          serving_size: 100,
          serving_unit: 'g',
          source: 'custom',
          isPlaceholder: true
        };
      } else {
        foodToUse = food;
      }

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
          screen: 'FoodList',
          params: {
            scannedFood: foodToUse,
            mealType,
            date,
            fromLog: true
          }
        });
      } else {
        // Regular navigation to Food screen
        console.log(`Regular navigation to Food screen with scanned food`);
        navigation.navigate('Food', {
          screen: 'FoodList',
          params: {
            scannedFood: foodToUse
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
      let foodToUse;
      try {
        const food = await foodService.getFoodByBarcode(manualBarcode);

        // Check if food was found, if not create a placeholder
        if (!food || !food.id) {
          console.log(`Could not find food with barcode ${manualBarcode}, creating placeholder food`);
          foodToUse = {
            id: `temp-${Date.now()}`,
            name: `Food with barcode ${manualBarcode}`,
            barcode: manualBarcode,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            serving_size: 100,
            serving_unit: 'g',
            source: 'custom',
            isPlaceholder: true
          };
        } else {
          foodToUse = food;
        }
      } catch (error) {
        console.log(`Error looking up barcode ${manualBarcode}, creating placeholder food`);
        foodToUse = {
          id: `temp-${Date.now()}`,
          name: `Food with barcode ${manualBarcode}`,
          barcode: manualBarcode,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          serving_size: 100,
          serving_unit: 'g',
          source: 'custom',
          isPlaceholder: true
        };
      }

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
          screen: 'FoodList',
          params: {
            scannedFood: foodToUse,
            mealType,
            date,
            fromLog: true
          }
        });
      } else {
        // Regular navigation to Food screen
        console.log(`Manual barcode - Regular navigation to Food screen with scanned food`);
        navigation.navigate('Food', {
          screen: 'FoodList',
          params: {
            scannedFood: foodToUse
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
            height: SCAN_AREA_SIZE,
            objectFit: 'cover',
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

  // Camera selector dropdown
  const renderCameraSelector = () => {
    if (Platform.OS !== 'web' || videoDevices.length <= 1) {
      return null;
    }

    return (
      <View style={styles.cameraSelector}>
        <Text style={styles.cameraSelectorLabel}>Select Camera:</Text>
        <View style={styles.cameraSelectorButtons}>
          {videoDevices.map((device) => (
            <Button
              key={device.deviceId}
              mode={selectedDeviceId === device.deviceId ? "contained" : "outlined"}
              onPress={() => {
                setSelectedDeviceId(device.deviceId);
                // Restart scanner with new device
                if (scannerStarted) {
                  stopScanner();
                  setTimeout(() => startScanner(), 500);
                }
              }}
              style={styles.cameraSelectorButton}
            >
              {device.label.substring(0, 20)}
              {device.label.length > 20 ? '...' : ''}
            </Button>
          ))}
        </View>
      </View>
    );
  };

  useEffect(() => {
    // Log navigation state for debugging
    const navigationState = navigation.getState();
    const routes = navigationState.routes;
    const currentRoute = routes[routes.length - 1];

    console.log("ZXingBarcodeScanner - Navigation State:",
      JSON.stringify({
        currentScreen: currentRoute.name,
        params: currentRoute.params || {},
        routesCount: routes.length,
        parentNavigator: navigation.getParent()?.getId() || 'none'
      }, null, 2)
    );
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>ZXing Barcode Scanner</Text>
        <Text style={styles.subHeaderText}>Enhanced for PWA on Android</Text>
      </View>

      {!hasInitialized && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scannerText}>Initializing scanner...</Text>
        </View>
      )}

      {/* Camera selector */}
      {renderCameraSelector()}

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
    backgroundColor: '#000',
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subHeaderText: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
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
  cameraSelector: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    margin: 8,
  },
  cameraSelectorLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  cameraSelectorButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cameraSelectorButton: {
    margin: 4,
    fontSize: 12,
  },
});