import { Recipe, CreateRecipeDTO } from '../types';
import { apiService } from './apiService';
import { AxiosResponse } from 'axios';

class RecipeService {
  async getRecipes(): Promise<Recipe[]> {
    const { data } = await apiService.get<AxiosResponse<Recipe[]>>('/recipes');
    return data;
  }

  async getRecipe(id: number): Promise<Recipe> {
    const { data } = await apiService.get<AxiosResponse<Recipe>>(`/recipes/${id}`);
    return data;
  }

  async createRecipe(data: CreateRecipeDTO): Promise<Recipe> {
    const { data: responseData } = await apiService.post<AxiosResponse<Recipe>>('/recipes', data);
    return responseData;
  }

  async updateRecipe(id: number, data: CreateRecipeDTO): Promise<Recipe> {
    const { data: responseData } = await apiService.put<AxiosResponse<Recipe>>(`/recipes/${id}`, data);
    return responseData;
  }

  async deleteRecipe(id: number): Promise<void> {
    await apiService.delete(`/recipes/${id}`);
  }

  async convertToFoodItem(recipeId: number): Promise<{ foodItemId: number }> {
    const { data } = await apiService.post<AxiosResponse<{ foodItemId: number }>>(`/recipes/${recipeId}/convert-to-food`);
    return data;
  }
}

export const recipeService = new RecipeService();