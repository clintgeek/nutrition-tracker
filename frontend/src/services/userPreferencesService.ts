import { apiService } from './apiService';
import type { HomeScreenCard } from '../components/home/HomeScreenEditor';

interface ApiResponse<T> {
  data: T;
}

class UserPreferencesService {
  async getHomeScreenLayout(): Promise<HomeScreenCard[]> {
    try {
      const response = await apiService.get('/user-preferences/home-screen-layout') as ApiResponse<HomeScreenCard[]>;
      return response.data || null;
    } catch (error) {
      console.error('Error getting home screen layout:', error);
      throw error;
    }
  }

  async updateHomeScreenLayout(layout: HomeScreenCard[]): Promise<HomeScreenCard[]> {
    try {
      const response = await apiService.put('/user-preferences/home-screen-layout', { layout }) as ApiResponse<HomeScreenCard[]>;
      return response.data;
    } catch (error) {
      console.error('Error updating home screen layout:', error);
      throw error;
    }
  }
}

export const userPreferencesService = new UserPreferencesService();