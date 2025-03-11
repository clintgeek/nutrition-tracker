export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: number;
  serving_unit: string;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  image_url?: string;
  is_custom?: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  source?: string;
  source_id?: string;
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
  source: string;
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