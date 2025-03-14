export interface Recipe {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  servings: number;
  total_calories: number;
  total_protein_grams: number;
  total_carbs_grams: number;
  total_fat_grams: number;
  created_at: string;
  updated_at: string;
  sync_id: string;
  is_deleted: boolean;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  food_item_id: number;
  amount: number;
  unit: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  sync_id: string;
  is_deleted: boolean;
  // Joined fields from food_items
  food_name?: string;
  calories_per_serving?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
}

export interface RecipeStep {
  id: number;
  recipe_id: number;
  description: string;
  order: number;
  created_at: string;
  updated_at: string;
  sync_id: string;
  is_deleted: boolean;
}

export interface CreateRecipeDTO {
  name: string;
  description?: string;
  servings: number;
  ingredients: Array<{
    food_item_id: number;
    amount: number;
    unit: string;
  }>;
  steps: Array<{
    description: string;
    order: number;
  }>;
}

export interface CreateRecipeStepDTO {
  description: string;
  order: number;
}