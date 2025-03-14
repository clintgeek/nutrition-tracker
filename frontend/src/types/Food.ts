export interface Food {
  id: string | number;
  name: string;
  calories: number;
  serving_size: number;
  serving_unit: string;
  protein: number;
  carbs: number;
  fat: number;
  created_at?: string;
  updated_at?: string;
  is_custom?: boolean;
  user_id?: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  source: 'custom' | 'usda' | 'recipe';
  barcode?: string;
  brand?: string;
  source_id?: string;
  sync_id?: string;
  is_deleted?: boolean;
}

// Interface for creating a new food item
export interface CreateFoodDTO {
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  source: 'custom' | 'usda' | 'recipe';
  source_id?: string;
}

export interface FoodSearchResult {
  foods: Food[];
  total_count: number;
  page: number;
  total_pages: number;
}

export interface FoodSearchParams {
  query?: string;
  barcode?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'calories' | 'protein' | 'carbs' | 'fat';
  sort_order?: 'asc' | 'desc';
  include_custom?: boolean;
}