import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform, Dimensions, Vibration, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, Text, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { foodService } from '../../services/foodService';
import { loggingService } from '../../services/loggingService';
import { validateBarcode } from '../../utils/validation';
import { useSafeAreaInsets } from '../../utils/safeArea';

const SCAN_AREA_SIZE = Math.min(Dimensions.get('window').width * 0.8, 300);
const SCAN_AREA_BORDER_WIDTH = 2;
const SCAN_AREA_CORNER_SIZE = 20;

// This component is specifically designed for the PWA on Android
export default function QuaggaBarcodeScanner() {
  const [hasInitialized, setHasInitialized] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannerStarted, setScannerStarted] = useState(false);

  const scannerRef = useRef<HTMLDivElement | null>(null);
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Load Quagga script dynamically
  useEffect(() => {
    const loadQuaggaScript = async () => {
      if (!hasInitialized && Platform.OS === 'web') {
        try {
          // Check if Quagga is already loaded
          if (!(window as any).Quagga) {
            loggingService.info('Loading Quagga script');
            // Create script element
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
            script.async = true;

            // Wait for script to load
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });

            loggingService.info('Quagga script loaded successfully');
          }

          setHasInitialized(true);
        } catch (err) {
          loggingService.error('Failed to load Quagga script', { error: err });
          setError('Failed to load barcode scanner. Please try again or use manual entry.');
          setShowErrorDialog(true);
        }
      }
    };

    loadQuaggaScript();

    // Cleanup function
    return () => {
      stopScanner();
    };
  }, []);

  // Initialize Quagga when component mounts and script is loaded
  useEffect(() => {
    if (hasInitialized && !scannerStarted && Platform.OS === 'web') {
      startScanner();
    }
  }, [hasInitialized]);

  const startScanner = async () => {
    if (!hasInitialized || !scannerRef.current || !(window as any).Quagga) {
      return;
    }

    try {
      const Quagga = (window as any).Quagga;

      // Clear any previous instances
      Quagga.stop();

      // Initialize Quagga
      await Quagga.init({
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: { min: 640 },
            height: { min: 480 },
            facingMode: "environment", // Use back camera
            aspectRatio: { min: 1, max: 2 }
          },
        },
        decoder: {
          readers: [
            "ean_reader", // EAN-13 & EAN-8
            "ean_8_reader",
            "upc_reader", // UPC-A & UPC-E
            "upc_e_reader",
            "code_128_reader", // Code 128
            "code_39_reader", // Code 39
            "code_39_vin_reader", // Code 39 VIN
            "i2of5_reader" // Interleaved 2 of 5
          ],
          debug: {
            showCanvas: true,
            showPatches: true,
            showFoundPatches: true,
            showSkeleton: true,
            showLabels: true,
            showPatchLabels: true,
            showRemainingPatchLabels: true,
            boxFromPatches: {
              showTransformed: true,
              showTransformedBox: true,
              showBB: true
            }
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        locate: true
      }, (err: any) => {
        if (err) {
          loggingService.error('Failed to initialize Quagga', { error: err });
          setError('Failed to initialize barcode scanner. Please try again or use manual entry.');
          setShowErrorDialog(true);
          return;
        }

        loggingService.info('Quagga initialized successfully');
        Quagga.start();
        setScannerStarted(true);

        // Add barcode detection listener
        Quagga.onDetected(handleBarcodeDetected);
      });
    } catch (err) {
      loggingService.error('Error starting Quagga scanner', { error: err });
      setError('Failed to start barcode scanner. Please try again or use manual entry.');
      setShowErrorDialog(true);
    }
  };

  const stopScanner = () => {
    if (Platform.OS === 'web' && (window as any).Quagga && scannerStarted) {
      (window as any).Quagga.stop();
      setScannerStarted(false);
    }
  };

  const handleBarcodeDetected = async (result: any) => {
    try {
      // Get barcode
      const code = result.codeResult.code;

      // Don't process the same code twice in a row
      if (scanned || code === lastScannedCode) {
        return;
      }

      setScanned(true);
      setLastScannedCode(code);
      loggingService.info('Barcode detected', { code });

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
          screen: 'FoodList',
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
          screen: 'FoodList',
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
          screen: 'FoodList',
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
          screen: 'FoodList',
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
      <>
        <div
          ref={scannerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '70%',
            overflow: 'hidden',
          }}
        />
        <Text style={styles.instructions}>
          Position a barcode in view to scan
        </Text>
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>QuaggaJS Barcode Scanner</Text>
        <Text style={styles.subHeaderText}>Enhanced for PWA on Android</Text>
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
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
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