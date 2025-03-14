const Recipe = require('../models/Recipe');

async function getRecipes(req, res) {
  try {
    const recipes = await Recipe.getRecipes(req.user.id);
    res.json(recipes);
  } catch (error) {
    console.error('Error getting recipes:', error);
    res.status(500).json({ error: 'Failed to get recipes' });
  }
}

async function getRecipe(req, res) {
  try {
    const recipe = await Recipe.getRecipeById(parseInt(req.params.id), req.user.id);
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

async function createRecipe(req, res) {
  try {
    const data = req.body;
    const recipe = await Recipe.createRecipe(req.user.id, data);
    const ingredients = await Recipe.getRecipeIngredients(recipe.id);
    res.status(201).json({ ...recipe, ingredients });
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
}

async function updateRecipe(req, res) {
  try {
    const data = req.body;
    const recipe = await Recipe.updateRecipe(parseInt(req.params.id), req.user.id, data);
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

async function deleteRecipe(req, res) {
  try {
    const success = await Recipe.deleteRecipe(parseInt(req.params.id), req.user.id);
    if (!success) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
}

async function convertToFoodItem(req, res) {
  try {
    const foodItemId = await Recipe.convertToFoodItem(parseInt(req.params.id), req.user.id);
    if (!foodItemId) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ foodItemId });
  } catch (error) {
    console.error('Error converting recipe to food item:', error);
    res.status(500).json({ error: 'Failed to convert recipe to food item' });
  }
}

async function updateIngredientOrder(req, res) {
  try {
    const { ingredientIds } = req.body;
    if (!Array.isArray(ingredientIds)) {
      return res.status(400).json({ error: 'ingredientIds must be an array' });
    }

    const success = await Recipe.updateIngredientOrder(
      parseInt(req.params.id),
      req.user.id,
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

module.exports = {
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  convertToFoodItem,
  updateIngredientOrder
};