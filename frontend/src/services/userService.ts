import { api } from './api';
import { UpdateProfileData, User } from '../types/User';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileResponse {
  message: string;
  user: User;
}

// Helper to ensure we have a valid auth token before requests
const ensureAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem('@NutritionTracker:token');
    if (token) {
      // Add token to API headers for this request
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('userService: Token verified for request');
      return true;
    } else {
      console.warn('userService: No auth token found in storage');
      return false;
    }
  } catch (error) {
    console.error('userService: Error retrieving auth token:', error);
    return false;
  }
};

export const userService = {
  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<ProfileResponse> {
    try {
      await ensureAuthenticated();
      console.log('userService: Making GET request to /users/profile');
      const response = await api.get('/users/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  /**
   * Update the user's profile
   * @param profileData - The profile data to update
   */
  async updateProfile(profileData: UpdateProfileData): Promise<ProfileResponse> {
    try {
      await ensureAuthenticated();
      console.log('userService: Making PUT request to /users/profile with data:', profileData);
      const response = await api.put('/users/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  },

  /**
   * Update the user's password
   * @param currentPassword - The current password
   * @param newPassword - The new password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      await ensureAuthenticated();
      console.log('userService: Making PUT request to /users/password');
      const response = await api.put('/users/password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  }
};