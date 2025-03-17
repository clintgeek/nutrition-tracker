import { AppRegistry, Platform } from 'react-native';
import { createRoot } from 'react-dom/client';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { SyncProvider } from './contexts/SyncContext';
import AppNavigator from './navigation/AppNavigator';
import theme from './utils/theme';
import React from 'react';

// Error fallback component
interface ErrorFallbackProps {
  error: Error;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error }) => {
  return (
    <div style={{
      padding: 20,
      margin: 20,
      backgroundColor: '#ffeeee',
      border: '1px solid #ff0000',
      borderRadius: 5
    }}>
      <h2>Something went wrong</h2>
      <p>{error.message || 'Unknown error'}</p>
      <button onClick={() => window.location.reload()}>
        Reload application
      </button>
    </div>
  );
};

// Custom error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Application error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error!} />;
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <AppErrorBoundary>
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
    </AppErrorBoundary>
  );
};

if (Platform.OS === 'web') {
  const rootTag = createRoot(document.getElementById('root')!);
  rootTag.render(<App />);
} else {
  AppRegistry.registerComponent('NutritionTracker', () => App);
}