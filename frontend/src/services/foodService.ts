import { Food, ApiFood, CreateFoodDTO, FoodSearchResult, FoodSearchParams } from '../types/Food';
import { apiService } from './apiService';
import { API_URL } from '../config';

// Food item interface
export interface FoodItem {
  id: number | string;
  name: string;
  barcode?: string | null;
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
  brand?: string | null;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
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
    serving_unit: 'servings'
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

  // Handle serving size
  nutrition.serving_size = parseNumericValue(
    food.serving_size ||
    food.portion_size ||
    food.serving_quantity ||
    food.serving_weight_grams ||
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

// Transform backend response to frontend FoodItem format
const transformToFoodItem = (data: any): FoodItem => ({
  id: data.id?.toString() || '',
  name: data.name,
  barcode: data.barcode,
  calories: data.calories || data.calories_per_serving,
  protein: data.protein || data.protein_grams,
  carbs: data.carbs || data.carbs_grams,
  fat: data.fat || data.fat_grams,
  servingSize: data.servingSize || data.serving_size,
  servingUnit: data.servingUnit || data.serving_unit,
  source: data.source,
  sourceId: data.source_id,
  source_id: data.source_id,
  brand: data.brand,
  created_at: data.created_at,
  updated_at: data.updated_at,
  is_deleted: data.is_deleted || false
});

// Transform backend response to frontend Food format
const transformToFood = (data: any): Food => ({
  id: data.id?.toString() || '',
  name: data.name,
  barcode: data.barcode,
  brand: data.brand,
  calories: data.calories || data.calories_per_serving,
  protein: data.protein || data.protein_grams,
  carbs: data.carbs || data.carbs_grams,
  fat: data.fat || data.fat_grams,
  serving_size: data.serving_size,
  serving_unit: data.serving_unit,
  is_custom: data.source === 'custom',
  source: data.source,
  source_id: data.source_id,
  created_at: data.created_at,
  updated_at: data.updated_at,
  is_deleted: data.is_deleted || false
});

// Helper function to capitalize food name
const capitalizeFoodName = (name: string): string => {
  return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

// Helper function to convert ApiFood to Food
function convertApiFood(apiFood: ApiFood): Food {
  const id = typeof apiFood.id === 'string' ? parseInt(apiFood.id, 10) : apiFood.id;
  if (isNaN(id)) {
    throw new Error(`Invalid food ID: ${apiFood.id}`);
  }

  let source: 'custom' | 'usda' | 'recipe' = 'custom';
  if (apiFood.source === 'usda' || apiFood.source === 'recipe') {
    source = apiFood.source;
  }

  const convertedFood: Food = {
    id,
    name: apiFood.name,
    calories: apiFood.calories,
    serving_size: apiFood.serving_size,
    serving_unit: apiFood.serving_unit,
    protein: apiFood.protein,
    carbs: apiFood.carbs,
    fat: apiFood.fat,
    created_at: apiFood.created_at,
    updated_at: apiFood.updated_at,
    is_custom: apiFood.is_custom,
    user_id: apiFood.user_id,
    sync_status: apiFood.sync_status,
    source,
    barcode: apiFood.barcode,
    brand: apiFood.brand,
    source_id: apiFood.source_id,
    sync_id: apiFood.sync_id,
    is_deleted: apiFood.is_deleted
  };

  return convertedFood;
}

// Helper function to convert array of ApiFood to Food
function convertApiFoods(apiFoods: ApiFood[]): Food[] {
  return apiFoods.map(convertApiFood);
}

// Food service
export const foodService = {
  // Search for foods
  async searchFood(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    const response = await apiService.get<SearchResponse>('/foods/search', {
      params: {
        query,
        page,
        limit,
        include_deleted: false
      },
    });

    if (response.foods) {
      // Map API response to ensure correct data structure
      const mappedFoods = response.foods.map((food: any) => {
        const nutrition = mapNutritionData(food);
        const brand = extractBrand(food);

        return {
          id: typeof food.id === 'string' ? parseInt(food.id, 10) : food.id,
          name: food.name || food.product_name || food.food_name || '',
          barcode: food.barcode || food.code || food.upc || null,
          brand,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          serving_size: nutrition.serving_size,
          serving_unit: nutrition.serving_unit,
          source: food.source === 'usda' || food.source === 'recipe' ? food.source : 'custom',
          source_id: food.sourceId || food.source_id || food.code || `api-${food.id}`,
          is_custom: food.source !== 'usda' && food.source !== 'recipe',
        };
      });

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
      const response = await apiService.get<SearchResponse>(`/api/foods/search?query=${encodeURIComponent(query)}`);
      return response.foods.map(food => ({
        ...food,
        id: typeof food.id === 'string' ? parseInt(food.id, 10) : food.id,
        source: food.source === 'usda' || food.source === 'recipe' ? food.source : 'custom'
      }));
    } catch (error) {
      console.error('Error in combined search:', error);
      return [];
    }
  },

  // Get food by barcode
  async getFoodByBarcode(barcode: string, retryCount = 2): Promise<Food> {
    try {
      // First try our backend
      try {
        const response = await apiService.get<{ food: Food }>(`/foods/barcode/${barcode}`);
        return response.food;
      } catch (error) {
        console.log('Food not found in local database, trying OpenFoodFacts...');
      }

      // If not found, try OpenFoodFacts with retries
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const response = await fetch(`${OPENFOODFACTS_API_URL}/product/${barcode}.json`);

          if (!response.ok) {
            if (response.status === 429 && attempt < retryCount) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            throw new Error(`OpenFoodFacts API error: ${response.status}`);
          }

          const data = await response.json();

          if (!data || !data.product) {
            throw new Error('Product not found');
          }

          if (!data.product.product_name && !data.product.generic_name) {
            throw new Error('Invalid product data: Missing product name');
          }

          const nutrition = mapNutritionData(data.product);
          const brand = extractBrand(data.product);

          return {
            id: Date.now(), // Generate a temporary numeric ID
            name: data.product.product_name || data.product.generic_name || 'Unknown Product',
            brand: brand,
            barcode: barcode,
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
            serving_size: nutrition.serving_size,
            serving_unit: nutrition.serving_unit,
            source: 'custom', // OpenFoodFacts items are treated as custom foods
            source_id: barcode,
            is_custom: true
          };
        } catch (error) {
          if (attempt === retryCount) {
            throw error;
          }
          console.log(`OpenFoodFacts retry ${attempt + 1}/${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }

      throw new Error('Failed to fetch product after all retries');
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Network error: Could not connect to OpenFoodFacts API');
      }
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
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

  // Create custom food
  async createCustomFood(food: CreateFoodDTO): Promise<Food> {
    try {
      const response = await apiService.post<{ food: ApiFood }>('/foods/custom', food);
      return convertApiFood(response.food);
    } catch (error) {
      console.error('Error creating custom food:', error);
      throw error;
    }
  },

  // Update custom food
  async updateCustomFood(id: number, food: Partial<CreateFoodDTO>): Promise<Food> {
    try {
      const response = await fetch(`${API_URL}/foods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(food),
      });

      if (!response.ok) {
        throw new Error('Failed to update custom food');
      }

      const data: { food: ApiFood } = await response.json();
      return convertApiFood(data.food);
    } catch (error) {
      console.error('Error updating custom food:', error);
      throw error;
    }
  },

  // Delete custom food
  async deleteCustomFood(id: number): Promise<void> {
    await apiService.delete(`/foods/custom/${id}`);
  },

  // Delete food (alias for deleteCustomFood for backward compatibility)
  async deleteFood(id: number): Promise<void> {
    try {
      // Transform the data to match database column names
      const transformedData = {
        is_deleted: true
      };

      await apiService.put<{ message: string; food: Food }>(`/foods/custom/${id}`, transformedData);
    } catch (error) {
      console.error('Error soft deleting food:', error);
      throw error;
    }
  },

  // Map food item from database to frontend format
  mapFoodItemToFood(item: FoodItem): Food {
    return {
      id: typeof item.id === 'string' ? parseInt(item.id, 10) : item.id,
      name: item.name,
      brand: item.brand || undefined,
      barcode: item.barcode || undefined,
      calories: item.calories || item.calories_per_serving || 0,
      protein: item.protein || item.protein_grams || 0,
      carbs: item.carbs || item.carbs_grams || 0,
      fat: item.fat || item.fat_grams || 0,
      serving_size: item.serving_size || 100,
      serving_unit: item.serving_unit || '',
      source: item.source === 'usda' || item.source === 'recipe' ? item.source : 'custom',
      source_id: item.source_id,
      is_custom: item.source !== 'usda' && item.source !== 'recipe',
      is_deleted: item.is_deleted || false,
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  },

  // Get food by ID
  async getFood(id: number): Promise<Food> {
    try {
      const response = await fetch(`${API_URL}/foods/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch food');
      }

      const data: { food: ApiFood } = await response.json();
      return convertApiFood(data.food);
    } catch (error) {
      console.error('Error fetching food:', error);
      throw error;
    }
  },

  // Search foods
  async searchFoods(params: FoodSearchParams): Promise<FoodSearchResult> {
    try {
      const queryParams = new URLSearchParams();
      if (params.query) queryParams.append('query', params.query);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.sort_order) queryParams.append('sort_order', params.sort_order);
      if (params.include_custom !== undefined) queryParams.append('include_custom', params.include_custom.toString());

      const response = await fetch(`${API_URL}/foods/search?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to search foods');
      }

      const data: { foods: ApiFood[]; total_count: number; page: number; total_pages: number } = await response.json();
      return {
        ...data,
        foods: convertApiFoods(data.foods)
      };
    } catch (error) {
      console.error('Error searching foods:', error);
      throw error;
    }
  },

  // Get custom foods
  async getCustomFoods(): Promise<Food[]> {
    try {
      const response = await apiService.get<{ foods: ApiFood[] }>('/foods/custom');
      return convertApiFoods(response.foods);
    } catch (error) {
      console.error('Error fetching custom foods:', error);
      throw error;
    }
  },
};