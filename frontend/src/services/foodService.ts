import { Food, CreateFoodDTO } from '../types/Food';
import { apiService } from './apiService';

interface FoodApiResponse {
  message: string;
  food: Food;
}

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
    serving_unit: 'g'
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

// Food service
export const foodService = {
  // Search for foods
  async searchFood(query: string, page = 1, limit = 20): Promise<SearchResponse> {
    const response = await apiService.get<SearchResponse>('/foods/search', {
      params: { query, page, limit },
    });

    if (response.foods) {
      // Map API response to ensure correct data structure
      const mappedFoods = response.foods.map((food: any) => {
        const nutrition = mapNutritionData(food);
        const brand = extractBrand(food);

        return {
          id: food.id?.toString() || '',
          name: food.name || food.product_name || food.food_name || '',
          barcode: food.barcode || food.code || food.upc || null,
          brand,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          serving_size: nutrition.serving_size,
          serving_unit: nutrition.serving_unit,
          source: food.source || 'api',
          source_id: food.sourceId || food.source_id || food.code || `api-${food.id}`,
          is_custom: false,
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
      const mappedFoods = response.foods.map(food => ({
        ...food,
        id: food.id.toString(),
      }));
      return mappedFoods;
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
            id: `off-${barcode}`,
            name: data.product.product_name || data.product.generic_name || 'Unknown Product',
            brand: brand,
            barcode: barcode,
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
            serving_size: nutrition.serving_size,
            serving_unit: nutrition.serving_unit,
            source: 'openfoodfacts',
            source_id: barcode,
            is_custom: false,
            image_url: data.product.image_url,
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

  // Get custom foods
  async getCustomFoods(page = 1, limit = 20): Promise<FoodItem[]> {
    try {
      const response = await apiService.get<CustomFoodsResponse>(`/foods/custom?page=${page}&limit=${limit}`);

      if (response && response.foods && Array.isArray(response.foods)) {
        return response.foods.map(food => ({
          ...transformToFoodItem(food),
          ...mapNutritionData(food)
        }));
      }

      console.warn('Unexpected custom foods response format');
      return [];
    } catch (error) {
      console.error('Error fetching custom foods:', error);
      throw error;
    }
  },

  // Create custom food
  async createCustomFood(foodData: CreateFoodDTO): Promise<Food> {
    try {
      const response = await apiService.post<FoodApiResponse>('/foods/custom', foodData);
      return response.food;
    } catch (error) {
      console.error('Error creating custom food:', error);
      throw error;
    }
  },

  // Update custom food
  async updateCustomFood(id: number, foodData: Partial<Food>): Promise<Food> {
    try {
      console.log('Original food data:', foodData);

      // Transform the data to match database column names
      const transformedData = {
        name: foodData.name,
        calories_per_serving: foodData.calories,
        protein_grams: foodData.protein,
        carbs_grams: foodData.carbs,
        fat_grams: foodData.fat,
        serving_size: foodData.serving_size,
        serving_unit: foodData.serving_unit,
        source: foodData.source,
        source_id: foodData.source_id,
        brand: foodData.brand,
        barcode: foodData.barcode
      };

      // Remove any undefined values
      Object.keys(transformedData).forEach(key => {
        if (transformedData[key] === undefined) {
          delete transformedData[key];
        }
      });

      console.log('Transformed food data:', transformedData);

      const response = await apiService.put<{ message: string; food: Food }>(`/foods/custom/${id}`, transformedData);
      return response.food;
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
    await apiService.delete(`/foods/custom/${id}`);
  },

  // Map food item from database to frontend format
  mapFoodItemToFood(item: FoodItem): Food {
    return {
      id: item.id.toString(),
      name: item.name,
      brand: item.brand || undefined,
      barcode: item.barcode || undefined,
      calories: item.calories || item.calories_per_serving || 0,
      protein: item.protein || item.protein_grams || 0,
      carbs: item.carbs || item.carbs_grams || 0,
      fat: item.fat || item.fat_grams || 0,
      serving_size: item.serving_size || 100,
      serving_unit: item.serving_unit || 'g',
      source: item.source,
      source_id: item.source_id,
      is_custom: item.source === 'custom',
      is_deleted: item.is_deleted || false,
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  }
};