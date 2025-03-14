import { db } from '../db';
import { Recipe, RecipeIngredient, CreateRecipeDTO } from '../types';

export async function getRecipes(userId: number): Promise<Recipe[]> {
  return db.query(
    'SELECT * FROM recipes WHERE user_id = $1 AND is_deleted = false ORDER BY created_at DESC',
    [userId]
  );
}

export async function getRecipeById(recipeId: number, userId: number): Promise<Recipe | null> {
  const recipes = await db.query(
    'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [recipeId, userId]
  );
  return recipes.length ? recipes[0] : null;
}

export async function getRecipeIngredients(recipeId: number): Promise<RecipeIngredient[]> {
  return db.query(
    `SELECT ri.*, f.name as food_name, f.calories_per_serving, f.protein_grams,
            f.carbs_grams, f.fat_grams
     FROM recipe_ingredients ri
     JOIN food_items f ON ri.food_item_id = f.id
     WHERE ri.recipe_id = $1 AND ri.is_deleted = false
     ORDER BY ri.order_index`,
    [recipeId]
  );
}

export async function createRecipe(userId: number, data: CreateRecipeDTO): Promise<Recipe> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create recipe
    const [recipe] = await client.query(
      `INSERT INTO recipes (user_id, name, description, servings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.name, data.description || null, data.servings]
    );

    // Add ingredients
    if (data.ingredients && data.ingredients.length > 0) {
      const ingredientValues = data.ingredients.map((ing, index) =>
        `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4}, ${index})`
      ).join(',');

      const ingredientParams = data.ingredients.flatMap(ing =>
        [ing.food_item_id, ing.amount, ing.unit || null]
      );

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
         VALUES ${ingredientValues}`,
        [recipe.id, ...ingredientParams]
      );
    }

    await client.query('COMMIT');
    return recipe;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateRecipe(recipeId: number, userId: number, data: Partial<CreateRecipeDTO>): Promise<Recipe | null> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Update recipe
    const updateFields = [];
    const updateValues = [recipeId, userId];
    let valueIndex = 3;

    if (data.name !== undefined) {
      updateFields.push(`name = $${valueIndex}`);
      updateValues.push(data.name);
      valueIndex++;
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${valueIndex}`);
      updateValues.push(data.description);
      valueIndex++;
    }
    if (data.servings !== undefined) {
      updateFields.push(`servings = $${valueIndex}`);
      updateValues.push(data.servings);
      valueIndex++;
    }

    if (updateFields.length > 0) {
      const [recipe] = await client.query(
        `UPDATE recipes
         SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = false
         RETURNING *`,
        updateValues
      );

      if (!recipe) {
        await client.query('ROLLBACK');
        return null;
      }

      // Update ingredients if provided
      if (data.ingredients) {
        // Mark all existing ingredients as deleted
        await client.query(
          'UPDATE recipe_ingredients SET is_deleted = true WHERE recipe_id = $1',
          [recipeId]
        );

        // Add new ingredients
        if (data.ingredients.length > 0) {
          const ingredientValues = data.ingredients.map((ing, index) =>
            `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4}, ${index})`
          ).join(',');

          const ingredientParams = data.ingredients.flatMap(ing =>
            [ing.food_item_id, ing.amount, ing.unit || null]
          );

          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
             VALUES ${ingredientValues}`,
            [recipeId, ...ingredientParams]
          );
        }
      }

      await client.query('COMMIT');
      return recipe;
    }

    await client.query('ROLLBACK');
    return null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRecipe(recipeId: number, userId: number): Promise<boolean> {
  const result = await db.query(
    'UPDATE recipes SET is_deleted = true WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [recipeId, userId]
  );
  return result.length > 0;
}

export async function convertToFoodItem(recipeId: number, userId: number): Promise<number | null> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get recipe with ingredients
    const [recipe] = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );

    if (!recipe) {
      await client.query('ROLLBACK');
      return null;
    }

    // Calculate total nutrition from ingredients
    const ingredients = await client.query(
      `SELECT ri.amount, ri.unit, f.calories_per_serving, f.protein_grams,
              f.carbs_grams, f.fat_grams, f.serving_size, f.serving_unit
       FROM recipe_ingredients ri
       JOIN food_items f ON ri.food_item_id = f.id
       WHERE ri.recipe_id = $1 AND ri.is_deleted = false`,
      [recipeId]
    );

    // Calculate totals (simplified - assumes compatible units)
    const totals = ingredients.reduce((acc, ing) => ({
      calories: acc.calories + (ing.calories_per_serving * ing.amount),
      protein: acc.protein + (ing.protein_grams * ing.amount),
      carbs: acc.carbs + (ing.carbs_grams * ing.amount),
      fat: acc.fat + (ing.fat_grams * ing.amount)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Create food item from recipe
    const [foodItem] = await client.query(
      `INSERT INTO food_items (
        name, calories_per_serving, protein_grams, carbs_grams, fat_grams,
        serving_size, serving_unit, user_id, recipe_id, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'recipe')
      RETURNING id`,
      [
        recipe.name,
        Math.round(totals.calories / recipe.servings),
        +(totals.protein / recipe.servings).toFixed(2),
        +(totals.carbs / recipe.servings).toFixed(2),
        +(totals.fat / recipe.servings).toFixed(2),
        '1',
        'serving',
        userId,
        recipeId
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

export async function updateIngredientOrder(
  recipeId: number,
  userId: number,
  ingredientIds: number[]
): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Verify recipe ownership
    const [recipe] = await client.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );

    if (!recipe) {
      await client.query('ROLLBACK');
      return false;
    }

    // Update order_index for each ingredient
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