import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { User } from '../types/User';

// Define the shape of the auth context
interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  updateUserData: (userData: Partial<User>) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

// Default context value
const defaultContextValue: AuthContextData = {
  user: null,
  token: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  updateUserData: async () => {},
  updatePassword: async () => {},
  clearError: () => {},
};

// Create the auth context with a default value
const AuthContext = createContext<AuthContextData>(defaultContextValue);

// Storage keys
const TOKEN_KEY = '@NutritionTracker:token';
const USER_KEY = '@NutritionTracker:user';

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user and token from storage on app start
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Get token and user data from storage
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          try {
            // Parse user data
            const parsedUser = JSON.parse(storedUser);

            // Set state and auth service token
            setToken(storedToken);
            setUser(parsedUser);
            authService.setToken(storedToken);
          } catch (error) {
            console.error('Failed to parse user data');
            AsyncStorage.removeItem(TOKEN_KEY);
            AsyncStorage.removeItem(USER_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading auth data');
      } finally {
        setLoading(false);
      }
    };

    loadStoredData();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(email, password);
      const { token, user } = response;

      setToken(token);
      setUser(user);

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      authService.setToken(token);
    } catch (error: any) {
      setError(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.register(name, email, password);
      const { token, user } = response;

      setToken(token);
      setUser(user);

      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      authService.setToken(token);
    } catch (error: any) {
      setError(error.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);

      await authService.logout();

      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (name: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('User not authenticated');
      }

      const updatedUser = await authService.updateProfile(name);

      setUser(updatedUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      setError(null);

      await authService.updatePassword(currentPassword, newPassword);
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Add a new function to update the full user data
  const updateUserData = async (userData: Partial<User>) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update the user in the context with merged data
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);

      // Update the user in AsyncStorage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      console.log('AuthContext: Updated user data in context and storage');
    } catch (error: any) {
      console.error('Error updating user data in context:', error);
      setError(error.message || 'Failed to update user data');
      throw error;
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  // Create context value
  const contextValue: AuthContextData = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updateUserData,
    updatePassword,
    clearError,
  };

  if (loading) {
    // Return a loading placeholder when loading
    return (
      <AuthContext.Provider value={contextValue}>
        {null}
      </AuthContext.Provider>
    );
  }

  // Render children when loaded
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};