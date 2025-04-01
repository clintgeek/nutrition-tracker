import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, Button, Card, useTheme, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loggingService } from '../../services/loggingService';

export default function BarcodeScannerSelector() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isSamsungDevice, setIsSamsungDevice] = useState(false);
  const [userAgent, setUserAgent] = useState<string | null>(null);

  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    detectEnvironment();
  }, []);

  const detectEnvironment = () => {
    try {
      // Detect Android
      const isAndroid = Platform.OS === 'android' ||
                        (Platform.OS === 'web' &&
                        typeof navigator !== 'undefined' &&
                        /android/i.test(navigator.userAgent));
      setIsAndroid(isAndroid);

      // Detect PWA mode
      const isPWA = typeof window !== 'undefined' &&
                    window.matchMedia &&
                    (window.matchMedia('(display-mode: standalone)').matches ||
                     window.matchMedia('(display-mode: fullscreen)').matches ||
                     window.matchMedia('(display-mode: minimal-ui)').matches ||
                     // @ts-ignore
                     (window.navigator && window.navigator.standalone));
      setIsPWA(isPWA);

      // Get user agent and detect Samsung device
      if (typeof navigator !== 'undefined' && navigator.userAgent) {
        const ua = navigator.userAgent;
        setUserAgent(ua);
        const isSamsung = /samsung|SM-|Galaxy/i.test(ua);
        setIsSamsungDevice(isSamsung);

        // Log for diagnostics
        loggingService.info('Device environment detected', {
          platform: Platform.OS,
          isAndroid,
          isPWA,
          isSamsung,
          userAgent: ua
        });
      }
    } catch (err) {
      console.error('Error detecting environment:', err);
      loggingService.error('Error detecting environment', { error: err });
    }
  };

  const navigateToScanner = (scannerType: string) => {
    switch (scannerType) {
      case 'original':
        navigation.navigate('BarcodeScanner');
        break;
      case 'quagga':
        navigation.navigate('QuaggaBarcodeScanner');
        break;
      case 'zxing':
        navigation.navigate('ZXingBarcodeScanner');
        break;
      case 'manual':
        navigation.navigate('BarcodeScanner', { showManualInput: true });
        break;
    }
  };

  const renderRecommendation = () => {
    if (Platform.OS === 'web') {
      if (isAndroid && isPWA && isSamsungDevice) {
        return (
          <Card style={styles.recommendationCard}>
            <Card.Content>
              <Text style={styles.recommendationTitle}>
                <MaterialCommunityIcons name="star" size={20} color="#FFC107" />
                {' '}Recommended for your Samsung device:
              </Text>
              <Text style={styles.recommendationText}>
                For the best experience on Samsung devices, use the ZXing scanner.
              </Text>
            </Card.Content>
          </Card>
        );
      } else if (isAndroid && isPWA) {
        return (
          <Card style={styles.recommendationCard}>
            <Card.Content>
              <Text style={styles.recommendationTitle}>
                <MaterialCommunityIcons name="star" size={20} color="#FFC107" />
                {' '}Recommended for Android PWA:
              </Text>
              <Text style={styles.recommendationText}>
                For Android PWAs, Quagga or ZXing scanners typically work best.
              </Text>
            </Card.Content>
          </Card>
        );
      }
    }
    return null;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Choose Barcode Scanner</Text>
        <Text style={styles.subHeaderText}>
          Select the scanner that works best with your device
        </Text>
      </View>

      {renderRecommendation()}

      <View style={styles.options}>
        <Card style={styles.optionCard} onPress={() => navigateToScanner('original')}>
          <Card.Content>
            <MaterialCommunityIcons name="camera" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>Native Camera Scanner</Text>
            <Text style={styles.optionDescription}>
              Uses the Expo Camera API for barcode scanning.
              Works best on native apps and modern browsers.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.optionCard} onPress={() => navigateToScanner('quagga')}>
          <Card.Content>
            <MaterialCommunityIcons name="barcode-scan" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>QuaggaJS Scanner</Text>
            <Text style={styles.optionDescription}>
              Web-optimized barcode scanner using QuaggaJS.
              Good alternative for PWAs and web browsers.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.optionCard} onPress={() => navigateToScanner('zxing')}>
          <Card.Content>
            <MaterialCommunityIcons name="qrcode-scan" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>ZXing Scanner</Text>
            <Text style={styles.optionDescription}>
              Alternative scanner using ZXing library.
              Works well on most Android devices, including Samsung.
            </Text>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />

        <Card style={styles.optionCard} onPress={() => navigateToScanner('manual')}>
          <Card.Content>
            <MaterialCommunityIcons name="keyboard" size={36} color={theme.colors.primary} style={styles.optionIcon} />
            <Text style={styles.optionTitle}>Manual Entry</Text>
            <Text style={styles.optionDescription}>
              Type the barcode number manually.
              Works on all devices and browsers.
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={styles.diagnosticInfo}>
        <Text style={styles.diagnosticTitle}>Device Information:</Text>
        <Text style={styles.diagnosticText}>Platform: {Platform.OS}</Text>
        <Text style={styles.diagnosticText}>Android: {isAndroid ? 'Yes' : 'No'}</Text>
        <Text style={styles.diagnosticText}>PWA Mode: {isPWA ? 'Yes' : 'No'}</Text>
        <Text style={styles.diagnosticText}>Samsung Device: {isSamsungDevice ? 'Yes' : 'No'}</Text>
        {userAgent && <Text style={styles.userAgentText} numberOfLines={2} ellipsizeMode="tail">
          UA: {userAgent.substring(0, 80)}{userAgent.length > 80 ? '...' : ''}
        </Text>}
      </View>

      <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          icon="arrow-left"
        >
          Go Back
        </Button>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = width > 600 ? width / 2 - 32 : width - 32;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
    textAlign: 'center',
  },
  options: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  optionCard: {
    width: cardWidth,
    marginBottom: 16,
    elevation: 3,
  },
  optionIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionDescription: {
    textAlign: 'center',
    color: '#666666',
  },
  divider: {
    width: '100%',
    marginVertical: 16,
    height: 1,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    alignItems: 'center',
  },
  recommendationCard: {
    margin: 16,
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
  },
  diagnosticInfo: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    margin: 16,
    borderRadius: 8,
  },
  diagnosticTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  diagnosticText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  userAgentText: {
    fontSize: 10,
    color: '#888888',
    marginTop: 4,
  }
});