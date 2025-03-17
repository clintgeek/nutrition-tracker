import { apiService, setAuthToken } from './apiService';

// User interface
interface User {
  id: number;
  name: string;
  email: string;
}

// Auth response interface
interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

// Profile update response interface
interface ProfileUpdateResponse {
  message: string;
  user: User;
}

// Auth service
export const authService = {
  // Set token
  setToken: (token: string): void => {
    setAuthToken(token);
  },

  // Clear token
  clearToken: (): void => {
    setAuthToken(null);
  },

  // Register
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    return apiService.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
  },

  // Login
  login: async (email: string, password: string): Promise<AuthResponse> => {
    return apiService.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    return apiService.get<{ user: User }>('/auth/me').then((response) => response.user);
  },

  // Update profile
  updateProfile: async (name: string): Promise<User> => {
    return apiService
      .put<ProfileUpdateResponse>('/users/profile', { name })
      .then((response) => response.user);
  },

  // Update password
  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return apiService.put<{ message: string }>('/users/password', {
      currentPassword,
      newPassword,
    }).then(() => {});
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      // First clear the token locally
      authService.clearToken();

      // Then try to call the API endpoint
      try {
        await apiService.post<{ message: string }>('/auth/logout');
      } catch (apiError) {
        // Continue with logout even if API call fails
      }
    } catch (error) {
      // Still return success even if there are errors
      // This ensures the user can still log out on the client side
    }
  },
};