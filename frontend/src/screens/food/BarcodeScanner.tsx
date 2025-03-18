import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Camera, CameraType, AutoFocus } from 'expo-camera';
import * as ExpoBarCodeScanner from 'expo-barcode-scanner';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ActivityIndicator, Text, useTheme, Button, Portal, Dialog } from 'react-native-paper';
import { foodService } from '../../services/foodService';
import { validateBarcode } from '../../utils/validation';

type BarCodeEvent = {
  type: string;
  data: string;
};

export default function BarcodeScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigation = useNavigation();
  const theme = useTheme();
  const isFocused = useIsFocused();

  // Request camera permission and initialize camera on mount
  useEffect(() => {
    let mounted = true;

    const initializeCamera = async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (mounted) {
          setHasPermission(status === 'granted');
          if (status !== 'granted') {
            setError('Camera permission is required to scan barcodes');
            setShowErrorDialog(true);
          }
        }
      } catch (err) {
        console.error('Error initializing camera:', err);
        if (mounted) {
          setError('Failed to initialize camera. Please try again.');
          setShowErrorDialog(true);
        }
      }
    };

    initializeCamera();

    return () => {
      mounted = false;
      if (camera) {
        camera.pausePreview();
      }
    };
  }, []);

  // Handle camera initialization
  const handleCameraRef = async (ref: Camera | null) => {
    setCamera(ref);
    if (ref) {
      try {
        // Start with camera paused
        await ref.pausePreview();

        // Give the camera more time to initialize on Android
        setTimeout(async () => {
          try {
            await ref.resumePreview();
            setIsInitialized(true);
          } catch (err) {
            console.error('Error resuming preview:', err);
            // Try one more time after a longer delay
            setTimeout(async () => {
              try {
                await ref.resumePreview();
                setIsInitialized(true);
              } catch (err) {
                console.error('Error resuming preview after retry:', err);
              }
            }, 1000);
          }
        }, Platform.OS === 'android' ? 1000 : 500);
      } catch (err) {
        console.error('Error handling camera ref:', err);
      }
    }
  };

  const handleBarCodeScanned = async (event: BarCodeEvent) => {
    try {
      setScanned(true);
      setIsLoading(true);
      setError(null);
      console.log(`Bar code with type ${event.type} and data ${event.data} has been scanned!`);

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
  };

  if (!isFocused) {
    return null;
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused && (
        <Camera
          ref={handleCameraRef}
          style={StyleSheet.absoluteFillObject}
          type={CameraType.back}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: [
              ExpoBarCodeScanner.Constants.BarCodeType.ean13,
              ExpoBarCodeScanner.Constants.BarCodeType.ean8,
              ExpoBarCodeScanner.Constants.BarCodeType.upc_e,
              ExpoBarCodeScanner.Constants.BarCodeType.upc_a,
            ],
          }}
          autoFocus={AutoFocus.on}
          useCamera2Api={false}
          ratio="16:9"
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

      {!isInitialized && (
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
            <Button onPress={() => {
              setShowErrorDialog(false);
              setScanned(false);
            }}>Try Again</Button>
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
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
    position: 'relative',
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
  }
});