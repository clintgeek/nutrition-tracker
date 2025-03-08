export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
  imageUrl?: string;
  isCustom: boolean;
  userId?: string; // If it's a user-created food
  createdAt: string;
  updatedAt: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
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