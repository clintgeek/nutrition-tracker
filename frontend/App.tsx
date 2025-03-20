import React from 'react';
import { Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { enGB, registerTranslation } from 'react-native-paper-dates';
import { AuthProvider } from './src/contexts/AuthContext';
import { SyncProvider } from './src/contexts/SyncContext';
import AppNavigator from './src/navigation/AppNavigator';
import theme from './src/utils/theme';

// Register English locale for the date picker
registerTranslation('en-GB', enGB);

// Add web-specific meta tags for better mobile experience
if (Platform.OS === 'web') {
  // Add viewport meta tag for responsive design
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(meta);

  // Add theme color meta tag
  const themeColorMeta = document.createElement('meta');
  themeColorMeta.name = 'theme-color';
  themeColorMeta.content = theme.colors.primary;
  document.head.appendChild(themeColorMeta);

  // Add apple-mobile-web-app-capable meta tag for iOS
  const appleMobileWebAppCapable = document.createElement('meta');
  appleMobileWebAppCapable.name = 'apple-mobile-web-app-capable';
  appleMobileWebAppCapable.content = 'yes';
  document.head.appendChild(appleMobileWebAppCapable);

  // Add apple-mobile-web-app-status-bar-style meta tag for iOS
  const appleMobileWebAppStatusBarStyle = document.createElement('meta');
  appleMobileWebAppStatusBarStyle.name = 'apple-mobile-web-app-status-bar-style';
  appleMobileWebAppStatusBarStyle.content = 'black-translucent';
  document.head.appendChild(appleMobileWebAppStatusBarStyle);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SyncProvider>
            <NavigationContainer theme={{
              dark: false,
              colors: {
                primary: theme.colors.primary,
                background: theme.colors.background,
                card: theme.colors.surface,
                text: theme.colors.text,
                border: theme.colors.disabled,
                notification: theme.colors.notification,
              },
            }}>
              <AppNavigator />
            </NavigationContainer>
          </SyncProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}