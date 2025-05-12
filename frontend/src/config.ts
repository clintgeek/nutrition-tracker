import { Platform } from 'react-native';

// Define __DEV__ for TypeScript
declare const __DEV__: boolean;

// Define window.API_CONFIG for TypeScript
declare global {
  interface Window {
    API_CONFIG?: {
      baseURL: string;
    };
  }
}

// Determine API base URL based on environment
let API_URL = '/api'; // Default for production web - this will use the current origin

// Check if we have a global API config override (set in index.html)
if (typeof window !== 'undefined' && window.API_CONFIG && window.API_CONFIG.baseURL) {
  API_URL = window.API_CONFIG.baseURL;
}
// For development
else if (__DEV__) {
  if (Platform.OS === 'web') {
    // Web development - use the same hostname but with backend port
    const hostname = window.location.hostname;
    const backendPort = 4081; // Backend port
    API_URL = `http://${hostname}:${backendPort}/api`;
  } else {
    // Native development - use IP address
    API_URL = 'http://192.168.1.17:4081/api';
  }
}

export { API_URL };