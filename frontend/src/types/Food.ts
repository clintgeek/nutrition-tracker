export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  // Frontend field names (for display and editing)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: number;
  servingUnit?: string;
  // Backend field names (for API requests)
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  serving_size?: string | number;
  serving_unit?: string;
  // Common fields
  fiber?: number;
  sugar?: number;
  sodium?: number;
  imageUrl?: string;
  isCustom?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
  source?: string;
  sourceId?: string;
  source_id?: string;
}

// Interface for creating a new food item (backend format)
export interface CreateFoodDTO {
  name: string;
  brand?: string;
  barcode?: string;
  calories_per_serving: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  serving_size: string | number;
  serving_unit: string;
  source: string;
  source_id?: string;
}

export interface FoodSearchResult {
  foods: Food[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface FoodSearchParams {
  query?: string;
  barcode?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'calories' | 'protein' | 'carbs' | 'fat';
  sortOrder?: 'asc' | 'desc';
  includeCustom?: boolean;
}