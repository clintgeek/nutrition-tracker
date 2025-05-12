import { Food } from '../types/Food';
import { FoodSaveContext } from '../types/FoodSaveContext';
import { foodLogService } from './foodLogService';
// import { useLogStore } from '../stores/logStore';
// import other stores/services as needed

export async function saveFoodToContext(food: Food, context: FoodSaveContext) {
  console.log('[foodSaveService] saveFoodToContext called', { food, context });
  switch (context.type) {
    case 'log':
      // Save to backend log
      if (food.id) {
        await foodLogService.createLog({
          log_date: context.date,
          meal_type: context.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          servings: 1,
          food_item_id: food.id,
        });
      } else {
        await foodLogService.createLog({
          log_date: context.date,
          meal_type: context.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          servings: 1,
          food_item: food,
        });
      }
      return;
    case 'recipe':
      // Implement addFoodToRecipe in your recipe store/service
      // return useRecipeStore.getState().addFoodToRecipe(food, context.recipeId);
      throw new Error('Recipe save not yet implemented');
    case 'custom':
      // Implement as needed
      throw new Error('Custom save not yet implemented');
    default:
      throw new Error('Unknown save context');
  }
}