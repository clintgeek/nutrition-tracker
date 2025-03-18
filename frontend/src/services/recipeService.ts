import { Recipe, CreateRecipeDTO } from '../types';
import { apiService } from './apiService';
import { AxiosResponse } from 'axios';

class RecipeService {
  async getRecipes(): Promise<Recipe[]> {
    console.log('[RecipeService] Fetching all recipes');
    try {
      const recipes = await apiService.get<Recipe[]>('/recipes');
      console.log(`[RecipeService] Received ${recipes?.length || 0} recipes`);
      return recipes || [];
    } catch (error) {
      console.error('[RecipeService] Error fetching recipes:', error);
      throw error;
    }
  }

  async getRecipe(id: number): Promise<Recipe> {
    console.log(`[RecipeService] Fetching recipe with id: ${id}`);
    try {
      const { data } = await apiService.get<AxiosResponse<Recipe>>(`/recipes/${id}`);
      console.log('[RecipeService] Recipe fetched successfully:', data);
      return data;
    } catch (error) {
      console.error(`[RecipeService] Error fetching recipe ${id}:`, error);
      throw error;
    }
  }

  async createRecipe(data: CreateRecipeDTO): Promise<Recipe> {
    console.log('[RecipeService] Creating new recipe:', data);
    try {
      const { data: responseData } = await apiService.post<AxiosResponse<Recipe>>('/recipes', data);
      console.log('[RecipeService] Recipe created successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('[RecipeService] Error creating recipe:', error);
      throw error;
    }
  }

  async updateRecipe(id: number, data: CreateRecipeDTO): Promise<Recipe> {
    console.log(`[RecipeService] Updating recipe ${id}:`, data);
    try {
      const { data: responseData } = await apiService.put<AxiosResponse<Recipe>>(`/recipes/${id}`, data);
      console.log('[RecipeService] Recipe updated successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error(`[RecipeService] Error updating recipe ${id}:`, error);
      throw error;
    }
  }

  async deleteRecipe(id: number): Promise<void> {
    console.log(`[RecipeService] Deleting recipe ${id}`);
    try {
      await apiService.delete(`/recipes/${id}`);
      console.log(`[RecipeService] Recipe ${id} deleted successfully`);
    } catch (error) {
      console.error(`[RecipeService] Error deleting recipe ${id}:`, error);
      throw error;
    }
  }

  async convertToFoodItem(recipeId: number): Promise<{ foodItemId: number }> {
    console.log(`[RecipeService] Converting recipe ${recipeId} to food item`);
    try {
      const { data } = await apiService.post<AxiosResponse<{ foodItemId: number }>>(`/recipes/${recipeId}/convert-to-food`);
      console.log(`[RecipeService] Recipe ${recipeId} converted to food item:`, data);
      return data;
    } catch (error) {
      console.error(`[RecipeService] Error converting recipe ${recipeId} to food item:`, error);
      throw error;
    }
  }
}

export const recipeService = new RecipeService();