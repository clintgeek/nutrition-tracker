import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
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

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token for authentication
let authToken: string | null = null;

// Set auth token
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: any): any => {
    if (authToken) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${authToken}`,
      };
    }
    return config;
  },
  (error) => {
    // Keep error logging for production debugging
    console.error('[ApiService] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('[ApiService] Network error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle API errors
    const { status, data } = error.response;
    console.error(`[ApiService] Error ${status}:`, data);

    switch (status) {
      case 401:
        // Unauthorized
        return Promise.reject(new Error(data.message || 'Unauthorized. Please login again.'));
      case 403:
        // Forbidden
        return Promise.reject(new Error(data.message || 'You do not have permission to access this resource.'));
      case 404:
        // Not found
        return Promise.reject(new Error(data.message || 'Resource not found.'));
      case 422:
        // Validation error
        return Promise.reject(new Error(data.message || 'Validation error.'));
      case 500:
        // Server error
        return Promise.reject(new Error(data.message || 'Server error. Please try again later.'));
      default:
        return Promise.reject(new Error(data.message || 'An error occurred. Please try again.'));
    }
  }
);

// API service
export const apiService = {
  // GET request
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get<T>(url, config).then((response) => response.data);
  },

  // POST request
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post<T>(url, data, config).then((response) => response.data);
  },

  // PUT request
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put<T>(url, data, config).then((response) => response.data);
  },

  // DELETE request
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete<T>(url, config).then((response) => response.data);
  },
};