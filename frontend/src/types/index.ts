export * from './Recipe';
export * from './Food';
// Add other type exports as needed

// Navigation types
export type RootStackParamList = {
  Recipes: undefined;
  RecipeDetail: { recipeId: number | 'new' };
  FoodSearch: { onSelect: (food: { id: number; serving_unit?: string }) => void };
  FoodDetail: { foodId: number };
};