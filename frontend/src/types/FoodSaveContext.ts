export type FoodSaveContext =
  | { type: 'log'; date: string; mealType: string }
  | { type: 'recipe'; recipeId: number }
  | { type: 'custom'; customId: string };
// Add more as needed