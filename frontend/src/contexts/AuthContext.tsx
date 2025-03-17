import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';

// Define the shape of the user object
interface User {
  id: number;
  name: string;
  email: string;
}

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
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
}

// Create the auth context with a default value
const AuthContext = createContext<AuthContextData>({
  user: null,
  token: null,
  loading: true,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  updatePassword: async () => {},
  clearError: () => {},
});

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
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Set the token in the auth service
          authService.setToken(storedToken);
        }
      } catch (error) {
        // Minimal error logging
        console.error('Auth storage error');
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

      // Save to state
      setToken(token);
      setUser(user);

      // Save to storage
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      // Set the token in the auth service
      authService.setToken(token);
    } catch (error: any) {
      setError(error.message || 'Failed to login');
      console.error('Login error:', error);
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

      // Save to state
      setToken(token);
      setUser(user);

      // Save to storage
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

      // Set the token in the auth service
      authService.setToken(token);
    } catch (error: any) {
      setError(error.message || 'Failed to register');
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);

      // Call the logout API endpoint
      await authService.logout();

      // Clear from storage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);

      // Clear from state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state and storage even if API call fails
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

      // Update state
      setUser(updatedUser);

      // Update storage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
      console.error('Update profile error:', error);
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
      console.error('Update password error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear error function
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        updateProfile,
        updatePassword,
        clearError,
      }}
    >
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