const db = require('../config/db');
import { Recipe, CreateRecipeDTO, RecipeIngredient, RecipeStep } from '../types';

export async function getRecipes(userId: number): Promise<Recipe[]> {
  const { rows } = await db.query(
    `SELECT r.*,
      COALESCE(json_agg(DISTINCT ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients,
      COALESCE(json_agg(DISTINCT rs.*) FILTER (WHERE rs.id IS NOT NULL), '[]') as steps
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id AND NOT ri.is_deleted
    LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id AND NOT rs.is_deleted
    WHERE r.user_id = $1 AND NOT r.is_deleted
    GROUP BY r.id
    ORDER BY r.name`,
    [userId]
  );
  return rows;
}

export async function getRecipeById(id: number, userId: number): Promise<Recipe | null> {
  const { rows } = await db.query(
    `SELECT r.*,
      COALESCE(json_agg(DISTINCT ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients,
      COALESCE(json_agg(DISTINCT rs.*) FILTER (WHERE rs.id IS NOT NULL), '[]') as steps
    FROM recipes r
    LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id AND NOT ri.is_deleted
    LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id AND NOT rs.is_deleted
    WHERE r.id = $1 AND r.user_id = $2 AND NOT r.is_deleted
    GROUP BY r.id`,
    [id, userId]
  );
  return rows[0] || null;
}

export async function createRecipe(userId: number, data: CreateRecipeDTO): Promise<Recipe> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Insert recipe
    const { rows: [recipe] } = await client.query(
      `INSERT INTO recipes (user_id, name, description, servings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.name, data.description || null, data.servings]
    );

    // Insert ingredients
    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientValues = data.ingredients.map((ing, index) =>
        `(${recipe.id}, ${ing.food_item_id}, ${ing.amount}, '${ing.unit}', ${index})`
      ).join(', ');

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
         VALUES ${ingredientValues}`
      );
    }

    // Insert steps
    if (data.steps && data.steps.length > 0) {
      const stepValues = data.steps.map((step, index) =>
        `(${recipe.id}, '${step.description}', ${index})`
      ).join(', ');

      await client.query(
        `INSERT INTO recipe_steps (recipe_id, description, order_index)
         VALUES ${stepValues}`
      );
    }

    await client.query('COMMIT');

    // Return the complete recipe with ingredients and steps
    const { rows: [completeRecipe] } = await db.query(
      `SELECT r.*,
        COALESCE(json_agg(DISTINCT ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients,
        COALESCE(json_agg(DISTINCT rs.*) FILTER (WHERE rs.id IS NOT NULL), '[]') as steps
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id AND NOT ri.is_deleted
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id AND NOT rs.is_deleted
      WHERE r.id = $1
      GROUP BY r.id`,
      [recipe.id]
    );

    return completeRecipe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateRecipe(id: number, userId: number, data: Partial<CreateRecipeDTO>): Promise<Recipe | null> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Update recipe
    const { rows: [recipe] } = await client.query(
      `UPDATE recipes
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           servings = COALESCE($3, servings)
       WHERE id = $4 AND user_id = $5 AND NOT is_deleted
       RETURNING *`,
      [data.name, data.description, data.servings, id, userId]
    );

    if (!recipe) {
      await client.query('ROLLBACK');
      return null;
    }

    // Update ingredients if provided
    if (data.ingredients) {
      // Soft delete existing ingredients
      await client.query(
        'UPDATE recipe_ingredients SET is_deleted = true WHERE recipe_id = $1',
        [id]
      );

      // Insert new ingredients
      if (data.ingredients.length > 0) {
        const ingredientValues = data.ingredients.map((ing, index) =>
          `(${id}, ${ing.food_item_id}, ${ing.amount}, '${ing.unit}', ${index})`
        ).join(', ');

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
           VALUES ${ingredientValues}`
        );
      }
    }

    // Update steps if provided
    if (data.steps) {
      // Soft delete existing steps
      await client.query(
        'UPDATE recipe_steps SET is_deleted = true WHERE recipe_id = $1',
        [id]
      );

      // Insert new steps
      if (data.steps.length > 0) {
        const stepValues = data.steps.map((step, index) =>
          `(${id}, '${step.description}', ${index})`
        ).join(', ');

        await client.query(
          `INSERT INTO recipe_steps (recipe_id, description, order_index)
           VALUES ${stepValues}`
        );
      }
    }

    await client.query('COMMIT');

    // Return the complete recipe with ingredients and steps
    const { rows: [completeRecipe] } = await db.query(
      `SELECT r.*,
        COALESCE(json_agg(DISTINCT ri.*) FILTER (WHERE ri.id IS NOT NULL), '[]') as ingredients,
        COALESCE(json_agg(DISTINCT rs.*) FILTER (WHERE rs.id IS NOT NULL), '[]') as steps
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id AND NOT ri.is_deleted
      LEFT JOIN recipe_steps rs ON r.id = rs.recipe_id AND NOT rs.is_deleted
      WHERE r.id = $1
      GROUP BY r.id`,
      [id]
    );

    return completeRecipe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRecipe(id: number, userId: number): Promise<boolean> {
  const { rowCount } = await db.query(
    'UPDATE recipes SET is_deleted = true WHERE id = $1 AND user_id = $2 AND NOT is_deleted',
    [id, userId]
  );
  return rowCount > 0;
}

export async function getRecipeIngredients(recipeId: number): Promise<RecipeIngredient[]> {
  const { rows } = await db.query(
    `SELECT ri.*, fi.name as food_name, fi.calories_per_serving, fi.protein_grams, fi.carbs_grams, fi.fat_grams
     FROM recipe_ingredients ri
     JOIN food_items fi ON ri.food_item_id = fi.id
     WHERE ri.recipe_id = $1 AND NOT ri.is_deleted
     ORDER BY ri.order_index`,
    [recipeId]
  );
  return rows;
}

export async function getRecipeSteps(recipeId: number): Promise<RecipeStep[]> {
  const { rows } = await db.query(
    'SELECT * FROM recipe_steps WHERE recipe_id = $1 AND NOT is_deleted ORDER BY order_index',
    [recipeId]
  );
  return rows;
}

export async function updateIngredientOrder(recipeId: number, userId: number, ingredientIds: number[]): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verify recipe ownership
    const { rows: [recipe] } = await client.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2 AND NOT is_deleted',
      [recipeId, userId]
    );

    if (!recipe) {
      await client.query('ROLLBACK');
      return false;
    }

    // Update order for each ingredient
    for (let i = 0; i < ingredientIds.length; i++) {
      await client.query(
        'UPDATE recipe_ingredients SET order_index = $1 WHERE id = $2 AND recipe_id = $3',
        [i, ingredientIds[i], recipeId]
      );
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function convertToFoodItem(recipeId: number, userId: number): Promise<number | null> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get recipe details
    const { rows: [recipe] } = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND NOT is_deleted',
      [recipeId, userId]
    );

    if (!recipe) {
      await client.query('ROLLBACK');
      return null;
    }

    // Get recipe ingredients with their nutritional info
    const { rows: ingredients } = await client.query(
      `SELECT ri.amount, ri.unit, fi.*
       FROM recipe_ingredients ri
       JOIN food_items fi ON ri.food_item_id = fi.id
       WHERE ri.recipe_id = $1 AND NOT ri.is_deleted`,
      [recipeId]
    );

    // Calculate total nutritional values
    const totalCalories = ingredients.reduce((sum, ing) => sum + (ing.calories_per_serving * ing.amount), 0);
    const totalProtein = ingredients.reduce((sum, ing) => sum + (ing.protein_grams * ing.amount), 0);
    const totalCarbs = ingredients.reduce((sum, ing) => sum + (ing.carbs_grams * ing.amount), 0);
    const totalFat = ingredients.reduce((sum, ing) => sum + (ing.fat_grams * ing.amount), 0);

    // Create a new food item from the recipe
    const { rows: [foodItem] } = await client.query(
      `INSERT INTO food_items (user_id, name, calories_per_serving, protein_grams, carbs_grams, fat_grams, serving_size, serving_unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        recipe.name,
        totalCalories / recipe.servings,
        totalProtein / recipe.servings,
        totalCarbs / recipe.servings,
        totalFat / recipe.servings,
        1,
        'serving'
      ]
    );

    await client.query('COMMIT');
    return foodItem.id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}