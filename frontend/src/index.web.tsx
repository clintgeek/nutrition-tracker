import { AppRegistry, Platform } from 'react-native';
import { createRoot } from 'react-dom/client';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import AppNavigator from './navigation/AppNavigator';
import theme from './utils/theme';

const App = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <SyncProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SyncProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

if (Platform.OS === 'web') {
  const rootTag = createRoot(document.getElementById('root')!);
  rootTag.render(<App />);
} else {
  AppRegistry.registerComponent('NutritionTracker', () => App);
}