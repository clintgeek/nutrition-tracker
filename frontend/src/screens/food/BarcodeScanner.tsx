import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Platform, Dimensions, Vibration, TextInput } from 'react-native';
import { Camera, CameraType, AutoFocus, FlashMode } from 'expo-camera';
import * as ExpoBarCodeScanner from 'expo-barcode-scanner';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Text, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { foodService } from '../../services/foodService';
import { loggingService } from '../../services/loggingService';
import { validateBarcode } from '../../utils/validation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BarCodeEvent = {
  type: string;
  data: string;
};

const SCAN_AREA_SIZE = Math.min(Dimensions.get('window').width * 0.8, 300);
const SCAN_AREA_BORDER_WIDTH = 2;
const SCAN_AREA_CORNER_SIZE = 20;

export default function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const cameraRef = useRef<Camera>(null);
  const navigation = useNavigation();
  const theme = useTheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  // Request camera permission and initialize camera on mount
  useEffect(() => {
    let mounted = true;

    const initializeCamera = async () => {
      try {
        loggingService.info('Starting camera initialization');

        // Request camera permission only (barcode scanner permission is included)
        const { status } = await Camera.requestCameraPermissionsAsync();
        loggingService.info('Camera permission status', { status });

        if (mounted) {
          const hasPermission = status === 'granted';
          setHasPermission(hasPermission);

          if (!hasPermission) {
            loggingService.error('Camera permission denied');
            setError('Camera permission is required to scan barcodes');
            setShowErrorDialog(true);
          } else {
            loggingService.info('Camera permission granted');
          }
        }
      } catch (err) {
        loggingService.error('Error initializing camera', { error: err });
        if (mounted) {
          setError('Failed to initialize camera. Please try again.');
          setShowErrorDialog(true);
        }
      }
    };

    initializeCamera();

    return () => {
      loggingService.info('Cleaning up camera');
      mounted = false;
      if (camera) {
        camera.pausePreview();
      }
    };
  }, []);

  // Handle camera initialization
  const handleCameraRef = useCallback(async (ref: Camera | null) => {
    loggingService.info('Camera ref received', { hasRef: !!ref });

    if (!ref) return;

    setCamera(ref);
    try {
      loggingService.info('Configuring camera');

      // Configure camera for optimal performance
      const camera = ref as any; // Type assertion for Camera methods
      loggingService.info('Setting camera type');
      await camera.setCameraTypeAsync(CameraType.back);

      loggingService.info('Setting flash mode');
      await camera.setFlashModeAsync(FlashMode.off);

      loggingService.info('Setting auto focus');
      await camera.setAutoFocusAsync(AutoFocus.on);

      loggingService.info('Starting preview');
      await ref.resumePreview();
      loggingService.info('Preview started successfully');

      setIsInitialized(true);
    } catch (err) {
      loggingService.error('Error configuring camera', { error: err });
      setError('Failed to configure camera. Please try again.');
      setShowErrorDialog(true);
    }
  }, []);

  const handleCameraReady = useCallback(() => {
    loggingService.info('Camera is ready');
    setIsCameraReady(true);
  }, []);

  const handleBarCodeScanned = useCallback(async (event: BarCodeEvent) => {
    // Prevent duplicate scans
    if (event.data === lastScannedCode) return;
    setLastScannedCode(event.data);

    try {
      setScanned(true);
      setIsLoading(true);
      setError(null);

      // Provide haptic feedback
      Vibration.vibrate(50);

      // Validate barcode format
      const validation = validateBarcode(event.data);
      if (!validation.isValid) {
        throw new Error(`Invalid barcode: ${validation.error}`);
      }

      // Look up the food by barcode
      const food = await foodService.getFoodByBarcode(event.data);

      // Navigate back to food screen with the scanned food
      navigation.navigate('Food', { screen: 'FoodList', params: { scannedFood: food } });
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
      setScanned(false);
    } finally {
      setIsLoading(false);
    }
  }, [lastScannedCode, navigation]);

  const handleManualBarcodeSubmit = useCallback(async () => {
    if (!manualBarcode.trim()) return;

    try {
      setScanned(true);
      setIsLoading(true);
      setError(null);

      // Validate barcode format
      const validation = validateBarcode(manualBarcode);
      if (!validation.isValid) {
        throw new Error(`Invalid barcode: ${validation.error}`);
      }

      // Look up the food by barcode
      const food = await foodService.getFoodByBarcode(manualBarcode);

      // Navigate back to food screen with the scanned food
      navigation.navigate('Food', { screen: 'FoodList', params: { scannedFood: food } });
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
      setScanned(false);
    } finally {
      setIsLoading(false);
      setShowManualInput(false);
      setManualBarcode('');
    }
  }, [manualBarcode, navigation]);

  const toggleFlash = useCallback(async () => {
    if (!camera) return;

    try {
      const newFlashMode = flashMode === FlashMode.off ? FlashMode.torch : FlashMode.off;
      const cameraInstance = camera as any; // Type assertion for Camera methods
      await cameraInstance.setFlashModeAsync(newFlashMode);
      setFlashMode(newFlashMode);
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  }, [camera, flashMode]);

  if (!isFocused) {
    return null;
  }

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.text}>No access to camera</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isFocused && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          type={CameraType.back}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          onCameraReady={handleCameraReady}
          barCodeScannerSettings={{
            barCodeTypes: [
              ExpoBarCodeScanner.Constants.BarCodeType.ean13,
              ExpoBarCodeScanner.Constants.BarCodeType.ean8,
              ExpoBarCodeScanner.Constants.BarCodeType.upc_e,
              ExpoBarCodeScanner.Constants.BarCodeType.upc_a,
              ExpoBarCodeScanner.Constants.BarCodeType.code128,
              ExpoBarCodeScanner.Constants.BarCodeType.code39,
              ExpoBarCodeScanner.Constants.BarCodeType.interleaved2of5,
            ],
          }}
          autoFocus={AutoFocus.on}
          useCamera2Api={Platform.OS === 'android'}
          ratio="16:9"
          onMountError={(error) => {
            loggingService.error('Camera mount error', { error });
            setError('Failed to start camera. Please try again.');
            setShowErrorDialog(true);
          }}
        >
          <View style={styles.overlay}>
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
        </Camera>
      )}

      {(!isInitialized || !isCameraReady) && (
        <View style={[styles.loadingOverlay, { backgroundColor: 'black' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scannerText}>Initializing camera...</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.scannerText}>Looking up food...</Text>
        </View>
      )}

      <View style={[styles.controls, { bottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={toggleFlash}
          style={styles.controlButton}
          icon={flashMode === FlashMode.off ? 'flash-off' : 'flash'}
        >
          {flashMode === FlashMode.off ? 'Turn On Flash' : 'Turn Off Flash'}
        </Button>
        <Button
          mode="contained"
          onPress={() => setShowManualInput(true)}
          style={styles.controlButton}
          icon="keyboard"
        >
          Enter Manually
        </Button>
      </View>

      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => {
            setShowErrorDialog(false);
            setScanned(false);
          }}
        >
          <Dialog.Title>Error</Dialog.Title>
          <Dialog.Content>
            <Text>{error}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setShowErrorDialog(false);
              setScanned(false);
            }}>Try Again</Button>
            <Button onPress={() => {
              setShowErrorDialog(false);
              setShowManualInput(true);
            }}>Enter Manually</Button>
            <Button onPress={() => {
              setShowErrorDialog(false);
              navigation.navigate('Food', { screen: 'AddFood' });
            }}>Add Manually</Button>
            <Button onPress={() => {
              setShowErrorDialog(false);
              navigation.goBack();
            }}>Cancel</Button>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: SCAN_AREA_BORDER_WIDTH,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scanAreaCorner: {
    position: 'absolute',
    width: SCAN_AREA_CORNER_SIZE,
    height: SCAN_AREA_CORNER_SIZE,
    borderColor: '#2196F3',
    borderWidth: SCAN_AREA_BORDER_WIDTH,
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
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  controlButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  manualInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
});