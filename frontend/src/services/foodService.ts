import { apiService } from './apiService';

// Food item interface
export interface FoodItem {
  id: number;
  name: string;
  barcode?: string;
  calories_per_serving: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  serving_size: string;
  serving_unit: string;
  source: string;
  source_id?: string;
}

// Search response interface
interface SearchResponse {
  foods: FoodItem[];
  page: number;
  limit: number;
  source: string;
}

// Barcode response interface
interface BarcodeResponse {
  food: FoodItem;
  source: string;
}

// Food service
export const foodService = {
  // Search food items
  searchFood: async (query: string, page = 1, limit = 20): Promise<SearchResponse> => {
    return apiService.get<SearchResponse>(`/foods/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },

  // Get food by barcode
  getFoodByBarcode: async (barcode: string): Promise<FoodItem> => {
    return apiService.get<BarcodeResponse>(`/foods/barcode/${barcode}`).then((response) => response.food);
  },

  // Create custom food
  createCustomFood: async (foodData: Omit<FoodItem, 'id' | 'source' | 'source_id'>): Promise<FoodItem> => {
    return apiService
      .post<{ message: string; food: FoodItem }>('/foods/custom', foodData)
      .then((response) => response.food);
  },

  // Update custom food
  updateCustomFood: async (id: number, foodData: Partial<FoodItem>): Promise<FoodItem> => {
    return apiService
      .put<{ message: string; food: FoodItem }>(`/foods/custom/${id}`, foodData)
      .then((response) => response.food);
  },

  // Delete custom food
  deleteCustomFood: async (id: number): Promise<void> => {
    return apiService.delete<{ message: string }>(`/foods/custom/${id}`).then(() => {});
  },

  // Get custom foods
  getCustomFoods: async (page = 1, limit = 20): Promise<FoodItem[]> => {
    return apiService
      .get<{ foods: FoodItem[]; page: number; limit: number }>(`/foods/custom?page=${page}&limit=${limit}`)
      .then((response) => response.foods);
  },
};