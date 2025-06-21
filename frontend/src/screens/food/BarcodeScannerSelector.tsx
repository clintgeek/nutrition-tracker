import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Platform, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Text, Button, Card, useTheme, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from '../../utils/safeArea';
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

  const handleScannerSelect = (scannerType: string) => {
    switch (scannerType) {
      case 'expo':
        navigation.navigate('BarcodeScanner' as never);
        break;
      case 'quagga':
        navigation.navigate('QuaggaBarcodeScanner' as never);
        break;
      case 'zxing':
        navigation.navigate('ZXingBarcodeScanner' as never);
        break;
      case 'simplified':
        navigation.navigate('SimplifiedBarcodeScanner' as never);
        break;
      default:
        Alert.alert('Error', 'Unknown scanner type');
    }
  };

  const scannerOptions = [
    {
      id: 'expo',
      title: 'Expo Camera Scanner',
      description: 'Uses Expo Camera with ML Kit',
      icon: 'camera',
      color: '#007AFF'
    },
    {
      id: 'quagga',
      title: 'QuaggaJS Scanner',
      description: 'Pure JavaScript barcode scanner',
      icon: 'barcode-scan',
      color: '#34C759'
    },
    {
      id: 'zxing',
      title: 'ZXing Scanner',
      description: 'ZXing library integration',
      icon: 'qrcode-scan',
      color: '#FF9500'
    },
    {
      id: 'simplified',
      title: 'Simplified Scanner',
      description: 'Basic camera with manual input',
      icon: 'camera-plus',
      color: '#AF52DE'
    }
  ];

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
        <Text style={[styles.title, { color: theme.colors.primary }]}>
          Choose Barcode Scanner
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurface }]}>
          Select the scanner that works best for you
        </Text>
      </View>

      {renderRecommendation()}

      <View style={styles.optionsContainer}>
        {scannerOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.optionCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleScannerSelect(option.id)}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
              <MaterialCommunityIcons name={option.icon as any} size={24} color="white" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>
                {option.title}
              </Text>
              <Text style={[styles.optionDescription, { color: theme.colors.onSurfaceVariant }]}>
                {option.description}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        ))}
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  optionsContainer: {
    padding: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    opacity: 0.7,
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