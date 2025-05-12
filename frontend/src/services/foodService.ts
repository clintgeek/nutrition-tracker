import { Food, ApiFood, CreateFoodDTO, FoodSearchResult, FoodSearchParams, FoodSource } from '../types/Food';
import { apiService } from './apiService';
import { API_URL } from '../config';

// Food item interface
export interface FoodItem {
  id: number | string;
  name: string;
  barcode?: string | null;
  brand?: string | null;
  // Frontend field names
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: number;
  servingUnit?: string;
  // Backend field names
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  serving_size?: number;
  serving_unit?: string;
  // Common fields
  source: string;
  sourceId?: string;
  source_id?: string;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  user_id?: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  sync_id?: string;
}

interface CustomFoodsResponse {
  foods: FoodItem[];
  page: number;
  limit: number;
}

// Search response interface
export interface SearchResponse {
  foods: Food[];
  total: number;
  page: number;
  limit: number;
}

// Barcode response interface
interface BarcodeResponse {
  food: FoodItem;
  source: string;
}

// OpenFoodFacts API base URL
const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v0';

// Helper function to safely parse numeric values
const parseNumericValue = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper function to map nutrition data from various sources
const mapNutritionData = (food: any): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
} => {
  // Initialize with default values
  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving_size: 100,
    serving_unit: 'g'
  };

  // Handle calories (different possible field names)
  nutrition.calories = Math.round(parseNumericValue(
    food.calories ||
    food.calories_per_serving ||
    food.energy ||
    food.energy_kcal ||
    food.kcal ||
    food.nutriments?.energy_kcal ||
    food.nutriments?.calories ||
    0
  ));

  // Handle protein
  nutrition.protein = parseNumericValue(
    food.protein ||
    food.protein_grams ||
    food.proteins ||
    food.proteins_100g ||
    food.nutriments?.proteins ||
    food.nutriments?.proteins_100g ||
    0
  );

  // Handle carbs
  nutrition.carbs = parseNumericValue(
    food.carbs ||
    food.carbs_grams ||
    food.carbohydrates ||
    food.carbohydrates_100g ||
    food.nutriments?.carbohydrates ||
    food.nutriments?.carbohydrates_100g ||
    0
  );

  // Handle fat
  nutrition.fat = parseNumericValue(
    food.fat ||
    food.fat_grams ||
    food.fats ||
    food.fat_100g ||
    food.nutriments?.fat ||
    food.nutriments?.fat_100g ||
    0
  );

  // Handle serving size (amount per serving, not total servings)
  nutrition.serving_size = parseNumericValue(
    food.serving_size ||
    food.serving_weight_grams ||
    food.portion_size ||
    100
  );

  // Handle serving unit
  nutrition.serving_unit = (
    food.serving_unit ||
    food.portion_unit ||
    food.serving_unit_name ||
    'g'
  ).toLowerCase();

  return nutrition;
};

// Helper function to extract brand from various API responses
const extractBrand = (food: any): string | null => {
  const brand = food.brand ||
    food.brand_name ||
    food.manufacturer ||
    food.product?.brand ||
    food.product?.brands ||
    food.brands ||
    food.brand_owner ||
    null;

  return brand;
};

// Helper function to calculate relevance score
const calculateRelevanceScore = (food: Food, query: string): number => {
  const searchTerms = query.toLowerCase().split(' ');
  let score = 0;

  // Base score from name match
  const name = food.name.toLowerCase();
  searchTerms.forEach(term => {
    if (name.includes(term)) {
      score += 10;
      // Bonus for exact word match
      if (name.split(' ').includes(term)) {
        score += 5;
      }
      // Bonus for match at start
      if (name.startsWith(term)) {
        score += 3;
      }
    }
  });

  // Brand match bonus
  if (food.brand) {
    const brand = food.brand.toLowerCase();
    searchTerms.forEach(term => {
      if (brand.includes(term)) {
        score += 5;
      }
    });
  }

  return score;
};

// Transform food data from API to frontend format
const transformFood = (food: any): Food => {
  return {
    id: food.id || food._id || Date.now(),
    name: food.name || '',
    brand: food.brand || null,
    calories: Number(food.calories || food.calories_per_serving || 0),
    protein: Number(food.protein || food.protein_grams || 0),
    carbs: Number(food.carbs || food.carbs_grams || 0),
    fat: Number(food.fat || food.fat_grams || 0),
    serving_size: Number(food.serving_size || 100),
    serving_unit: food.serving_unit || 'g',
    source: food.source || 'custom',
    source_id: food.source_id || null,
    barcode: food.barcode || null,
    created_at: food.created_at || new Date().toISOString(),
    updated_at: food.updated_at || new Date().toISOString(),
    is_deleted: food.is_deleted || false,
    user_id: food.user_id || null,
    sync_status: food.sync_status || 'synced',
    sync_id: food.sync_id || null,
    is_custom: food.source === 'custom'
  };
};

interface RecentFoodsResponse {
  foods: Food[];
  total: number;
}

// Food service
export const foodService = {
  // Search for foods
  async searchFood(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    // Special handling for barcode searches
    if (query.startsWith('barcode:')) {
      const barcode = query.replace('barcode:', '').trim();

      try {
        // First try direct barcode endpoint
        const barcodeResponse = await apiService.get<{ food: any, source: string }>(`/foods/barcode/${barcode}`);
        if (barcodeResponse && barcodeResponse.food) {
          const food = transformFood(barcodeResponse.food);
          return {
            foods: [food],
            total: 1,
            page: 1,
            limit: 1
          };
        }
      } catch (error) {
        // Keep error logging for production debugging
        console.warn('Direct barcode API lookup failed:', error);
      }
    }

    try {
      const response = await apiService.get<SearchResponse>(`/foods/search`, {
        params: { query, page, limit }
      });
      return response;
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error in regular search:', error);
      throw error;
    }
  },

  // Get recent foods
  async getRecentFoods(limit = 50): Promise<Food[]> {
    try {
      const response = await apiService.get<RecentFoodsResponse>(`/foods/recent`, {
        params: { limit }
      });
      return response.foods.map(food => transformFood(food));
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error getting recent foods:', error);
      throw error;
    }
  },

  // Get custom foods
  async getCustomFoods(includeAll = false): Promise<Food[]> {
    try {
      const response = await apiService.get<CustomFoodsResponse>(`/foods/custom`, {
        params: { includeAll }
      });
      return response.foods.map(food => transformFood(food));
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error getting custom foods:', error);
      throw error;
    }
  },

  // Get recipe foods
  async getRecipeFoods(): Promise<Food[]> {
    try {
      const response = await apiService.get<CustomFoodsResponse>(`/foods/recipes`);
      return response.foods.map(food => transformFood(food));
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error getting recipe foods:', error);
      throw error;
    }
  },

  // Get food by barcode
  async getFoodByBarcode(barcode: string, retryCount = 2): Promise<Food> {
    try {
      const response = await apiService.get<BarcodeResponse>(`/foods/barcode/${barcode}`);
      return transformFood(response.food);
    } catch (error) {
      // Keep error logging for production debugging
      console.error('Error getting food by barcode:', error);

      // Try OpenFoodFacts as fallback
      try {
        const offResponse = await fetch(`${OPENFOODFACTS_API_URL}/product/${barcode}.json`);
        const data = await offResponse.json();

        if (data.status === 1 && data.product) {
          const nutrition = mapNutritionData(data.product);
          const brand = extractBrand(data.product);

          return {
            id: Date.now(),
            name: data.product.product_name || 'Unknown Product',
            brand: brand || undefined,
            ...nutrition,
            source: 'openFoodFacts' as FoodSource,
            source_id: barcode,
            barcode,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_deleted: false,
            user_id: undefined,
            sync_status: 'synced',
            sync_id: undefined,
            is_custom: false
          };
        }
      } catch (offError) {
        // Keep error logging for production debugging
        console.error('Error fetching from OpenFoodFacts:', offError);
      }

      throw error;
    }
  },

  // Helper function to ensure food has numeric ID
  ensureNumericId(food: any): Food {
    const numericId = Number(food.id);
    if (isNaN(numericId)) {
      throw new Error('Invalid food ID');
    }
    return {
      ...food,
      id: numericId,
      source: food.source === 'openfoodfacts' ? 'custom' : (food.source || 'custom')
    } as Food;
  },

  // Search for foods (consolidated search method)
  async searchFoods(params: FoodSearchParams): Promise<SearchResponse> {
    try {
      const response = await apiService.get<SearchResponse>('/api/foods/search', {
        params: {
          ...params,
          cache: false // Always fresh for database searches
        }
      });

      if (response.foods) {
        return {
          ...response,
          foods: response.foods.map(transformFood)
        };
      }

      return response;
    } catch (error: unknown) {
      console.error('Error searching foods:', error);
      throw error;
    }
  },

  // Get food by ID
  async getFood(id: number): Promise<Food> {
    try {
      const response = await apiService.get<{ food: Food }>(`/foods/${id}`);
      return transformFood(response.food);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error getting food:', error.message);
      } else {
        console.error('Error getting food:', error);
      }
      throw error;
    }
  },

  // Create custom food
  async createCustomFood(food: CreateFoodDTO): Promise<Food> {
    try {
      const response = await apiService.post<Food>('/foods/custom', food);
      return response;
    } catch (error: unknown) {
      // Keep error logging for production debugging
      console.error('Error creating custom food:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Update custom food
  async updateCustomFood(id: number, food: Partial<CreateFoodDTO>): Promise<Food> {
    try {
      const response = await apiService.put<Food>(`/foods/custom/${id}`, food);
      return response;
    } catch (error: unknown) {
      // Keep error logging for production debugging
      console.error('Error updating custom food:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Delete custom food
  async deleteCustomFood(id: number): Promise<void> {
    try {
      await apiService.delete(`/foods/custom/${id}`);
    } catch (error: unknown) {
      // Keep error logging for production debugging
      console.error('Error deleting custom food:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Delete food
  async deleteFood(id: number): Promise<void> {
    try {
      await apiService.delete(`/foods/${id}`);
    } catch (error: unknown) {
      // Keep error logging for production debugging
      console.error('Error deleting food:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },

  // Check if food exists
  async checkFoodExists(params: { barcode?: string, name?: string }): Promise<{
    exists: boolean,
    food?: Food,
    similarFoods?: Food[]
  }> {
    try {
      const response = await apiService.get<{
        exists: boolean,
        food?: Food,
        similarFoods?: Food[]
      }>('/foods/check', { params });
      return response;
    } catch (error: unknown) {
      // Keep error logging for production debugging
      console.error('Error checking if food exists:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  },
};