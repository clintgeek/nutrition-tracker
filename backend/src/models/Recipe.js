// Recipe model for database operations
// FIXED: Added direct nutrition calculation for recipe ingredients
// - Simplified to take values directly from the first ingredient
// - Uses proper PostgreSQL typing with ::numeric cast

const db = require('../config/db');
const logger = require('../config/logger');

// Import redisService if available
let redisService;
try {
  redisService = require('../services/redisService');
} catch (error) {
  console.log('Redis service not available, cache clearing disabled');
  redisService = null;
}

async function getRecipes(userId) {
  const result = await db.query(
    'SELECT * FROM recipes WHERE user_id = $1 AND is_deleted = false ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function getRecipeById(recipeId, userId) {
  const result = await db.query(
    'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
    [recipeId, userId]
  );
  return result.rows.length ? result.rows[0] : null;
}

async function getRecipeIngredients(recipeId) {
  console.log('Getting ingredients for recipe:', recipeId);

  const result = await db.query(
    `SELECT
      ri.*,
      f.name as food_name,
      f.calories_per_serving,
      f.protein_grams,
      f.carbs_grams,
      f.fat_grams,
      f.serving_size,
      f.serving_unit,
      f.source
    FROM recipe_ingredients ri
    JOIN food_items f ON ri.food_item_id = f.id
    WHERE ri.recipe_id = $1 AND ri.is_deleted = false
    ORDER BY ri.order_index`,
    [recipeId]
  );

  // Log what we got from the database
  console.log(`Found ${result.rows.length} ingredients for recipe ${recipeId}`);
  console.log('First ingredient:', result.rows.length > 0 ? JSON.stringify(result.rows[0]) : 'None');

  return result.rows;
}

async function createRecipe(userId, data) {
  console.log('SIMPLIFIED createRecipe with data:', JSON.stringify(data, null, 2));

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Create recipe
    const result = await client.query(
      `INSERT INTO recipes (user_id, name, description, servings, sync_id)
       VALUES ($1, $2, $3, $4, gen_random_uuid())
       RETURNING *`,
      [userId, data.name, data.description || null, data.servings]
    );
    const recipe = result.rows[0];
    console.log('Created recipe:', recipe.id);

    // Set default nutrition values
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    // Add ingredients if any
    if (data.ingredients && data.ingredients.length > 0) {
      // Insert ingredients
      for (const ing of data.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
           VALUES ($1, $2, $3, $4, $5)`,
          [recipe.id, ing.food_item_id, ing.amount, ing.unit || 'serving', ing.order_index || 0]
        );

        // Fetch food item data directly
        const foodItemResult = await client.query(
          'SELECT * FROM food_items WHERE id = $1',
          [ing.food_item_id]
        );

        if (foodItemResult.rows.length > 0) {
          const foodItem = foodItemResult.rows[0];
          console.log('Ingredient info:', {
            name: foodItem.name,
            calories: foodItem.calories_per_serving,
            protein: foodItem.protein_grams,
            carbs: foodItem.carbs_grams,
            fat: foodItem.fat_grams
          });

          // Add to totals - convert all values to numbers with fallback to 0
          totalCalories += parseFloat(foodItem.calories_per_serving) || 0;
          totalProtein += parseFloat(foodItem.protein_grams) || 0;
          totalCarbs += parseFloat(foodItem.carbs_grams) || 0;
          totalFat += parseFloat(foodItem.fat_grams) || 0;
        }
      }
    }

    console.log('Final nutrition totals:', {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat
    });

    // Update recipe with nutrition totals
    await client.query(
      `UPDATE recipes
       SET
         total_calories = $1::numeric,
         total_protein_grams = $2::numeric,
         total_carbs_grams = $3::numeric,
         total_fat_grams = $4::numeric
       WHERE id = $5`,
      [totalCalories, totalProtein, totalCarbs, totalFat, recipe.id]
    );

    // Calculate per-serving values based on recipe servings
    const perServingCalories = totalCalories / recipe.servings;
    const perServingProtein = totalProtein / recipe.servings;
    const perServingCarbs = totalCarbs / recipe.servings;
    const perServingFat = totalFat / recipe.servings;

    console.log('Per-serving nutrition (divided by', recipe.servings, 'servings):', {
      calories: perServingCalories,
      protein: perServingProtein,
      carbs: perServingCarbs,
      fat: perServingFat
    });

    // Create food item with PER SERVING values
    await client.query(
      `INSERT INTO food_items (
        user_id, name, calories_per_serving, protein_grams, carbs_grams, fat_grams,
        serving_size, serving_unit, source, recipe_id, source_id
      ) VALUES ($1, $2, $3::numeric, $4::numeric, $5::numeric, $6::numeric, $7, $8, $9, $10, $11)`,
      [
        userId,
        recipe.name,
        perServingCalories,
        perServingProtein,
        perServingCarbs,
        perServingFat,
        1,
        'serving',
        'recipe',
        recipe.id,
        `recipe-${recipe.id}`
      ]
    );

    // Verify the saved data before committing
    const recipeCheck = await client.query(
      'SELECT * FROM recipes WHERE id = $1',
      [recipe.id]
    );
    console.log('FINAL CHECK - Recipe data:', JSON.stringify(recipeCheck.rows[0], null, 2));

    // Clear any cache related to food items
    try {
      if (redisService && redisService.deletePattern) {
        console.log('Clearing food cache for user');
        await redisService.deletePattern(`food-*-${userId}-*`);
        await redisService.deletePattern(`food-search-${userId}-*`);
        await redisService.deletePattern(`food-custom-${userId}`);
        await redisService.deletePattern(`food-recipes-${userId}`);
        console.log('Food cache cleared successfully');
      }
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
      // Continue with the operation even if cache clearing fails
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

async function updateRecipe(recipeId, userId, data) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if recipe exists and belongs to user
    const recipesResult = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );
    if (!recipesResult.rows.length) {
      return null;
    }

    // Update recipe
    const updateFields = [];
    const updateParams = [recipeId];
    let paramIndex = 2;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateParams.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateParams.push(data.description);
    }
    if (data.servings !== undefined) {
      updateFields.push(`servings = $${paramIndex++}`);
      updateParams.push(data.servings);
    }

    let recipe;
    if (updateFields.length > 0) {
      const recipeResult = await client.query(
        `UPDATE recipes SET ${updateFields.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        updateParams
      );
      recipe = recipeResult.rows[0];
    } else {
      recipe = recipesResult.rows[0];
    }

    // Update ingredients if provided
    if (data.ingredients) {
      // Mark all existing ingredients as deleted
      await client.query(
        'UPDATE recipe_ingredients SET is_deleted = true, updated_at = NOW() WHERE recipe_id = $1',
        [recipeId]
      );

      // Add new ingredients
      if (data.ingredients.length > 0) {
        const ingredientValues = data.ingredients.map((ing, index) =>
          `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, ${index})`
        ).join(',');

        const ingredientParams = data.ingredients.flatMap(ing =>
          [recipeId, ing.food_item_id, ing.amount, ing.unit || 'serving']
        );

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
           VALUES ${ingredientValues}`,
          ingredientParams
        );
      }

      // Calculate nutrition totals
      const ingredients = await getRecipeIngredients(recipeId);
      const nutritionTotals = ingredients.reduce((totals, ing) => ({
        calories: totals.calories + (parseFloat(ing.calories_per_serving) || 0),
        protein: totals.protein + (parseFloat(ing.protein_grams) || 0),
        carbs: totals.carbs + (parseFloat(ing.carbs_grams) || 0),
        fat: totals.fat + (parseFloat(ing.fat_grams) || 0)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      console.log('Recipe update - nutrition totals:', nutritionTotals);
      console.log('Recipe servings:', recipe.servings);

      // Calculate per-serving nutrition
      const perServing = {
        calories: nutritionTotals.calories / recipe.servings,
        protein: nutritionTotals.protein / recipe.servings,
        carbs: nutritionTotals.carbs / recipe.servings,
        fat: nutritionTotals.fat / recipe.servings
      };

      console.log('Recipe update - per-serving nutrition:', perServing);

      // Update recipe with nutrition totals
      await client.query(
        `UPDATE recipes
         SET total_calories = $1, total_protein_grams = $2, total_carbs_grams = $3, total_fat_grams = $4
         WHERE id = $5`,
        [
          nutritionTotals.calories,
          nutritionTotals.protein,
          nutritionTotals.carbs,
          nutritionTotals.fat,
          recipeId
        ]
      );

      // Check if a food item already exists for this recipe
      const foodItemResult = await client.query(
        'SELECT id FROM food_items WHERE recipe_id = $1 AND user_id = $2 AND is_deleted = false',
        [recipeId, userId]
      );

      if (foodItemResult.rows.length > 0) {
        // Update existing food item
        await client.query(
          `UPDATE food_items
           SET name = $1, calories_per_serving = $2, protein_grams = $3, carbs_grams = $4, fat_grams = $5, updated_at = NOW()
           WHERE recipe_id = $6 AND user_id = $7`,
          [
            recipe.name,
            perServing.calories,
            perServing.protein,
            perServing.carbs,
            perServing.fat,
            recipeId,
            userId
          ]
        );
      } else {
        // Create new food item
        await client.query(
          `INSERT INTO food_items (
            user_id, name, calories_per_serving, protein_grams, carbs_grams, fat_grams,
            serving_size, serving_unit, source, recipe_id, source_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userId,
            recipe.name,
            perServing.calories,
            perServing.protein,
            perServing.carbs,
            perServing.fat,
            1,
            'serving',
            'recipe',
            recipeId,
            `recipe-${recipe.id}`
          ]
        );
      }
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

async function deleteRecipe(recipeId, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    console.log(`Deleting recipe ${recipeId} for user ${userId}`);

    // First, check if recipe exists
    const checkResult = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );

    if (checkResult.rows.length === 0) {
      console.log(`Recipe ${recipeId} not found or already deleted`);
      await client.query('ROLLBACK');
      return false;
    }

    console.log(`Found recipe: ${JSON.stringify(checkResult.rows[0])}`);

    // Mark recipe as deleted
    const result = await client.query(
      'UPDATE recipes SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id',
      [recipeId, userId]
    );

    if (result.rowCount === 0) {
      console.log(`Failed to mark recipe ${recipeId} as deleted`);
      await client.query('ROLLBACK');
      return false;
    }

    console.log(`Successfully marked recipe ${recipeId} as deleted`);

    // Also mark the corresponding food item as deleted - use a direct query to see exactly what's happening
    const foodItemResult = await client.query(
      'SELECT * FROM food_items WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    console.log(`Found ${foodItemResult.rows.length} food items for recipe ${recipeId}`);

    if (foodItemResult.rows.length > 0) {
      console.log(`Food items to delete: ${JSON.stringify(foodItemResult.rows)}`);

      const deleteResult = await client.query(
        'UPDATE food_items SET is_deleted = true, updated_at = NOW() WHERE recipe_id = $1 AND user_id = $2 RETURNING id',
        [recipeId, userId]
      );

      console.log(`Deleted ${deleteResult.rowCount} food items`);
    }

    // Clear any cache related to this user's foods
    try {
      if (redisService && redisService.deletePattern) {
        await redisService.deletePattern(`food-*-${userId}-*`);
        await redisService.deletePattern(`food-search-${userId}-*`);
        await redisService.deletePattern(`food-custom-${userId}`);
        await redisService.deletePattern(`food-recipes-${userId}`);
        console.log('Cleared food cache for user');
      }
    } catch (cacheError) {
      console.error('Error clearing cache:', cacheError);
      // Continue with the operation even if cache clearing fails
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    console.error(`Error deleting recipe ${recipeId}:`, error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function convertToFoodItem(recipeId, userId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get recipe with ingredients
    const recipesResult = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );
    if (!recipesResult.rows.length) {
      return null;
    }
    const recipe = recipesResult.rows[0];

    // Calculate nutrition totals
    const ingredients = await getRecipeIngredients(recipeId);
    const nutritionTotals = ingredients.reduce((totals, ing) => {
      return {
        calories: totals.calories + (parseFloat(ing.calories_per_serving) || 0),
        protein: totals.protein + (parseFloat(ing.protein_grams) || 0),
        carbs: totals.carbs + (parseFloat(ing.carbs_grams) || 0),
        fat: totals.fat + (parseFloat(ing.fat_grams) || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    console.log('Convert to food - nutrition totals:', nutritionTotals);
    console.log('Recipe servings:', recipe.servings);

    // Calculate per-serving nutrition
    const perServing = {
      calories: nutritionTotals.calories / recipe.servings,
      protein: nutritionTotals.protein / recipe.servings,
      carbs: nutritionTotals.carbs / recipe.servings,
      fat: nutritionTotals.fat / recipe.servings
    };

    console.log('Convert to food - per-serving nutrition:', perServing);

    // Create food item with correct column names
    const foodItemResult = await client.query(
      `INSERT INTO food_items (
        user_id, name, calories_per_serving, protein_grams, carbs_grams, fat_grams,
        serving_size, serving_unit, source, recipe_id, source_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        userId,
        recipe.name,
        perServing.calories,
        perServing.protein,
        perServing.carbs,
        perServing.fat,
        1,
        'serving',
        'recipe',
        recipeId,
        `recipe-${recipe.id}`
      ]
    );
    const foodItem = foodItemResult.rows[0];

    // Update recipe with nutrition totals
    await client.query(
      `UPDATE recipes
       SET total_calories = $1, total_protein_grams = $2, total_carbs_grams = $3, total_fat_grams = $4
       WHERE id = $5`,
      [
        nutritionTotals.calories,
        nutritionTotals.protein,
        nutritionTotals.carbs,
        nutritionTotals.fat,
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

async function updateIngredientOrder(recipeId, userId, ingredientIds) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if recipe exists and belongs to user
    const recipesResult = await client.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2 AND is_deleted = false',
      [recipeId, userId]
    );
    if (!recipesResult.rows.length) {
      return false;
    }

    // Update ingredient order
    for (let i = 0; i < ingredientIds.length; i++) {
      await client.query(
        'UPDATE recipe_ingredients SET order_index = $1, updated_at = NOW() WHERE id = $2 AND recipe_id = $3',
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

module.exports = {
  getRecipes,
  getRecipeById,
  getRecipeIngredients,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  convertToFoodItem,
  updateIngredientOrder
};