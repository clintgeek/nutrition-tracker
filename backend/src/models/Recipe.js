const db = require('../config/db');

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
  const result = await db.query(
    `SELECT ri.*, f.name as food_name, f.calories_per_serving, f.protein_grams,
            f.carbs_grams, f.fat_grams
     FROM recipe_ingredients ri
     JOIN food_items f ON ri.food_item_id = f.id
     WHERE ri.recipe_id = $1 AND ri.is_deleted = false
     ORDER BY ri.order_index`,
    [recipeId]
  );
  return result.rows;
}

async function createRecipe(userId, data) {
  console.log('createRecipe called with:', { userId, data });
  console.log('db object:', db);

  const client = await db.getClient();
  try {
    console.log('Got client, beginning transaction');
    await client.query('BEGIN');

    // Create recipe
    console.log('Inserting recipe with data:', { userId, name: data.name, description: data.description, servings: data.servings });
    const result = await client.query(
      `INSERT INTO recipes (user_id, name, description, servings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, data.name, data.description || null, data.servings]
    );
    const recipe = result.rows[0];
    console.log('Recipe inserted:', recipe);

    // Add ingredients
    if (data.ingredients && data.ingredients.length > 0) {
      console.log('Adding ingredients:', data.ingredients);
      const ingredientValues = data.ingredients.map((ing, index) =>
        `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4}, ${index})`
      ).join(',');

      const ingredientParams = data.ingredients.flatMap(ing =>
        [recipe.id, ing.food_item_id, ing.amount, ing.unit || 'serving']
      );

      console.log('Ingredient SQL:', `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index) VALUES ${ingredientValues}`);
      console.log('Ingredient params:', ingredientParams);

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, food_item_id, amount, unit, order_index)
         VALUES ${ingredientValues}`,
        ingredientParams
      );
      console.log('Ingredients added successfully');

      // Calculate nutrition totals
      const ingredients = await getRecipeIngredients(recipe.id);
      const nutritionTotals = ingredients.reduce((totals, ing) => ({
        calories: totals.calories + (ing.calories_per_serving || 0) * (ing.amount || 1),
        protein: totals.protein + (ing.protein_grams || 0) * (ing.amount || 1),
        carbs: totals.carbs + (ing.carbs_grams || 0) * (ing.amount || 1),
        fat: totals.fat + (ing.fat_grams || 0) * (ing.amount || 1)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Calculate per-serving nutrition
      const perServing = {
        calories: Math.round(nutritionTotals.calories / recipe.servings),
        protein: Math.round((nutritionTotals.protein / recipe.servings) * 100) / 100,
        carbs: Math.round((nutritionTotals.carbs / recipe.servings) * 100) / 100,
        fat: Math.round((nutritionTotals.fat / recipe.servings) * 100) / 100
      };

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
          recipe.id
        ]
      );

      // Automatically create a food item from this recipe
      console.log('Automatically creating food item from recipe');
      await client.query(
        `INSERT INTO food_items (
          user_id, name, calories_per_serving, protein_grams, carbs_grams, fat_grams,
          serving_size, serving_unit, source, recipe_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
          recipe.id
        ]
      );
      console.log('Food item created successfully');
    }

    console.log('Committing transaction');
    await client.query('COMMIT');
    console.log('Transaction committed');
    return recipe;
  } catch (error) {
    console.error('Error in createRecipe:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    console.log('Releasing client');
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
          `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4}, ${index})`
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
        calories: totals.calories + (ing.calories_per_serving || 0) * (ing.amount || 1),
        protein: totals.protein + (ing.protein_grams || 0) * (ing.amount || 1),
        carbs: totals.carbs + (ing.carbs_grams || 0) * (ing.amount || 1),
        fat: totals.fat + (ing.fat_grams || 0) * (ing.amount || 1)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      // Calculate per-serving nutrition
      const perServing = {
        calories: Math.round(nutritionTotals.calories / recipe.servings),
        protein: Math.round((nutritionTotals.protein / recipe.servings) * 100) / 100,
        carbs: Math.round((nutritionTotals.carbs / recipe.servings) * 100) / 100,
        fat: Math.round((nutritionTotals.fat / recipe.servings) * 100) / 100
      };

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
            serving_size, serving_unit, source, recipe_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
            recipeId
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

    // Mark recipe as deleted
    const result = await client.query(
      'UPDATE recipes SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND is_deleted = false RETURNING id',
      [recipeId, userId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    // Also mark the corresponding food item as deleted
    await client.query(
      'UPDATE food_items SET is_deleted = true, updated_at = NOW() WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
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
    const nutritionTotals = ingredients.reduce((totals, ing) => ({
      calories: totals.calories + (ing.calories_per_serving || 0) * (ing.amount || 1),
      protein: totals.protein + (ing.protein_grams || 0) * (ing.amount || 1),
      carbs: totals.carbs + (ing.carbs_grams || 0) * (ing.amount || 1),
      fat: totals.fat + (ing.fat_grams || 0) * (ing.amount || 1)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Calculate per-serving nutrition
    const perServing = {
      calories: Math.round(nutritionTotals.calories / recipe.servings),
      protein: Math.round((nutritionTotals.protein / recipe.servings) * 100) / 100,
      carbs: Math.round((nutritionTotals.carbs / recipe.servings) * 100) / 100,
      fat: Math.round((nutritionTotals.fat / recipe.servings) * 100) / 100
    };

    // Create food item
    const foodItemResult = await client.query(
      `INSERT INTO food_items (
        user_id, name, calories, protein, carbs, fat,
        serving_size, serving_unit, source, recipe_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        recipeId
      ]
    );
    const foodItem = foodItemResult.rows[0];

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