import { Food, CreateFoodDTO } from '../types/Food';
import { apiService } from './apiService';

interface FoodApiResponse {
  message: string;
  food: Food;
}

// Cache interface
interface CacheEntry {
  timestamp: number;
  data: Food[];
}

interface SearchCache {
  [key: string]: CacheEntry;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const searchCache: SearchCache = {};

const isCacheValid = (entry: CacheEntry): boolean => {
  return Date.now() - entry.timestamp < CACHE_DURATION;
};

const getCachedResults = (query: string): Food[] | null => {
  const entry = searchCache[query];
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  return null;
};

const setCacheResults = (query: string, results: Food[]) => {
  searchCache[query] = {
    timestamp: Date.now(),
    data: results,
  };
};

// Food item interface
export interface FoodItem {
  id: number | string;
  name: string;
  barcode?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  source: string;
  sourceId?: string;
  brand?: string | null;
  created_at?: string;
  updated_at?: string;
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
  servingSize: number;
  servingUnit: string;
} => {
  // Initialize with default values
  const nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: 100,
    servingUnit: 'g'
  };

  // Handle calories (different possible field names)
  nutrition.calories = parseNumericValue(
    food.calories ||
    food.calories_per_serving ||
    food.energy ||
    food.energy_kcal ||
    food.kcal ||
    food.nutriments?.energy_kcal ||
    food.nutriments?.calories ||
    0
  );

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

  // Handle serving size
  nutrition.servingSize = parseNumericValue(
    food.servingSize ||
    food.serving_size ||
    food.portion_size ||
    food.serving_quantity ||
    food.serving_weight_grams ||
    100
  );

  // Handle serving unit
  nutrition.servingUnit = (
    food.servingUnit ||
    food.serving_unit ||
    food.portion_unit ||
    food.serving_unit_name ||
    'g'
  ).toLowerCase();

  return nutrition;
};

// Food service
export const foodService = {
  // Search for foods with caching
  async searchFood(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    const cachedResults = getCachedResults(query);
    if (cachedResults) {
      return {
        foods: cachedResults,
        total: cachedResults.length,
        page: 1,
        limit: cachedResults.length,
      };
    }

    console.log('Fetching from API with query:', query);
    const response = await apiService.get<SearchResponse>('/foods/search', {
      params: { query, page, limit },
    });
    console.log('Raw API response:', response);

    if (response.foods) {
      // Map API response to ensure correct data structure
      const mappedFoods = response.foods.map((food: any) => {
        const nutrition = mapNutritionData(food);

        return {
          id: food.id?.toString() || '',
          name: food.name || food.product_name || food.food_name || '',
          barcode: food.barcode || food.code || food.upc || null,
          brand: food.brand || food.brand_name || food.manufacturer || null,
          ...nutrition,
          source: food.source || 'api',
          sourceId: food.sourceId || food.source_id || food.code || `api-${food.id}`,
          isCustom: false,
        };
      });

      console.log('Mapped API foods:', mappedFoods);
      setCacheResults(query, mappedFoods);
      return {
        ...response,
        foods: mappedFoods,
      };
    }

    return response;
  },

  // Combined search that merges database and API results
  async combinedSearch(query: string, page = 1, limit = 20): Promise<Food[]> {
    try {
      // Get database results
      const dbFoods = await this.getCustomFoods();
      console.log('Raw DB foods:', dbFoods);

      const mappedDbFoods = dbFoods.map((item: any) => {
        const nutrition = mapNutritionData(item);

        return {
          id: item.id?.toString() || '',
          name: item.name || '',
          barcode: item.barcode || null,
          brand: item.brand || null,
          ...nutrition,
          isCustom: true,
          source: item.source || 'custom',
          sourceId: item.sourceId || item.source_id,
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
        };
      });

      console.log('Mapped DB foods:', mappedDbFoods);

      if (!query.trim()) {
        return mappedDbFoods;
      }

      // Get API results (cached if available)
      const apiResponse = await this.searchFood(query, page, limit);
      console.log('API search response:', apiResponse);

      const apiResults = (apiResponse.foods || []).map((food: any) => {
        const nutrition = mapNutritionData(food);

        return {
          id: food.id?.toString() || '',
          name: food.name || food.product_name || food.food_name || '',
          barcode: food.barcode || food.code || food.upc || null,
          brand: food.brand || food.brand_name || food.manufacturer || null,
          ...nutrition,
          source: food.source || 'api',
          sourceId: food.sourceId || food.source_id || food.code || `api-${food.id}`,
          isCustom: false,
        };
      });

      console.log('Mapped API results:', apiResults);

      // Merge results with local foods first
      const allFoods = [...mappedDbFoods];

      // Add API results that don't exist in local DB
      apiResults.forEach(apiFood => {
        const exists = allFoods.some(food =>
          food.source === apiFood.source &&
          food.sourceId === apiFood.sourceId
        );
        if (!exists) {
          allFoods.push(apiFood);
        }
      });

      console.log('Final merged foods:', allFoods);
      return allFoods;
    } catch (error) {
      console.error('Error in combinedSearch:', error);
      return [];
    }
  },

  // Get food by barcode
  async getFoodByBarcode(barcode: string): Promise<Food> {
    const response = await apiService.get<{ food: Food }>(`/foods/barcode/${barcode}`);
    return response.food;
  },

  // Create custom food
  async createCustomFood(foodData: CreateFoodDTO): Promise<Food> {
    const response = await apiService.post<FoodApiResponse>('/foods/custom', foodData);
    return response.food;
  },

  // Update custom food
  async updateCustomFood(id: number, foodData: Partial<Food>): Promise<Food> {
    const response = await apiService.put<FoodApiResponse>(`/foods/custom/${id}`, foodData);
    return response.food;
  },

  // Delete custom food
  async deleteCustomFood(id: number): Promise<void> {
    await apiService.delete(`/foods/custom/${id}`);
  },

  // Get custom foods
  async getCustomFoods(page = 1, limit = 20): Promise<FoodItem[]> {
    try {
      const response = await apiService.get<CustomFoodsResponse>(`/foods/custom?page=${page}&limit=${limit}`);
      console.log('Custom foods response:', response);

      if (response && response.foods && Array.isArray(response.foods)) {
        return response.foods;
      }

      console.warn('Unexpected response format from getCustomFoods:', response);
      return [];
    } catch (error) {
      console.error('Error in getCustomFoods:', error);
      return [];
    }
  },

  async deleteFood(id: number): Promise<void> {
    await apiService.delete(`/foods/custom/${id}`);
  },
};