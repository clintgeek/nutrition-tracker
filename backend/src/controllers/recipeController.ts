import { Request, Response } from 'express';
import * as Recipe from '../models/Recipe';
import { CreateRecipeDTO } from '../types';

export async function getRecipes(req: Request, res: Response) {
  try {
    const recipes = await Recipe.getRecipes(req.user!.id);
    res.json(recipes);
  } catch (error) {
    console.error('Error getting recipes:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
}

export async function getRecipe(req: Request, res: Response) {
  try {
    const recipe = await Recipe.getRecipeById(parseInt(req.params.id), req.user!.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = await Recipe.getRecipeIngredients(recipe.id);
    res.json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Error getting recipe:', error);
    res.status(500).json({ error: 'Failed to get recipe' });
  }
}

export async function createRecipe(req: Request, res: Response) {
  try {
    const data: CreateRecipeDTO = req.body;
    const recipe = await Recipe.createRecipe(req.user!.id, data);
    const ingredients = await Recipe.getRecipeIngredients(recipe.id);
    res.status(201).json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
}

export async function updateRecipe(req: Request, res: Response) {
  try {
    const data: Partial<CreateRecipeDTO> = req.body;
    const recipe = await Recipe.updateRecipe(parseInt(req.params.id), req.user!.id, data);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const ingredients = await Recipe.getRecipeIngredients(recipe.id);
    res.json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Failed to update recipe' });
  }
}

export async function deleteRecipe(req: Request, res: Response) {
  try {
    const success = await Recipe.deleteRecipe(parseInt(req.params.id), req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
}

export async function convertToFoodItem(req: Request, res: Response) {
  try {
    const foodItemId = await Recipe.convertToFoodItem(parseInt(req.params.id), req.user!.id);
    if (!foodItemId) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ foodItemId });
  } catch (error) {
    console.error('Error converting recipe to food item:', error);
    res.status(500).json({ error: 'Failed to convert recipe to food item' });
  }
}

export async function updateIngredientOrder(req: Request, res: Response) {
  try {
    const { ingredientIds } = req.body;
    if (!Array.isArray(ingredientIds)) {
      return res.status(400).json({ error: 'ingredientIds must be an array' });
    }

    const success = await Recipe.updateIngredientOrder(
      parseInt(req.params.id),
      req.user!.id,
      ingredientIds
    );

    if (!success) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error updating ingredient order:', error);
    res.status(500).json({ error: 'Failed to update ingredient order' });
  }
}