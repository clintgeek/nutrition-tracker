import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL
const API_URL = 'http://localhost:3000/api';

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
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle API errors
    const { status, data } = error.response;

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