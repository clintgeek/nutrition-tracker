import { DefaultTheme } from 'react-native-paper';

// Define the app's color palette
const colors = {
  primary: '#6098cc',
  accent: '#2196F3',
  background: '#f5f5f5',
  surface: '#FFFFFF',
  surfaceVariant: '#FFFFFF',  // Back to white for card backgrounds
  text: '#212121',
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF9800',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FFC107',
  info: '#2196F3',
};

// Create the theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
  },
  roundness: 8,
  animation: {
    scale: 1.0,
  },
  fonts: {
    ...DefaultTheme.fonts,
  },
};

// Export the theme
export { colors };
export default theme;