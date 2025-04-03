const { validationResult } = require('express-validator');
const FoodItem = require('../models/FoodItem');
const FoodApiService = require('../utils/foodApiService');
const nutritionixService = require('../utils/nutritionixService');
const spoonacularService = require('../utils/spoonacularService');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/db');
const redisService = require('../services/redisService');

// Helper function to invalidate food-related caches
const invalidateFoodCaches = async () => {
  try {
    await Promise.all([
      redisService.del('food-search:*'),
      redisService.del('food-debug-search:*'),
      redisService.del('food-barcode:*'),
      redisService.del('food-recent:*'),
      redisService.del('food-custom:*')
    ]);
    logger.info('Food-related caches invalidated');
  } catch (error) {
    logger.error('Error invalidating food caches:', error);
  }
};

/**
 * Debug endpoint to check raw API results
 * @route GET /api/foods/debug-search
 */
const debugSearch = asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  try {
    logger.info(`Debug search for: ${query}`);

    // Run API searches in parallel
    const searches = [
      nutritionixService.searchByName(query).catch(error => {
        logger.error(`Nutritionix search error: ${error.message}`);
        return [];
      }),
      FoodApiService.searchUSDAByName(query, true).catch(error => {
        logger.error(`USDA search error: ${error.message}`);
        return [];
      }),
      spoonacularService.searchByName(query).catch(error => {
        logger.error(`Spoonacular search error: ${error.message}`);
        return [];
      })
    ];

    // Wait for all searches to complete
    const [nutritionixResults, usdaResults, spoonacularResults] = await Promise.all(searches);

    res.json({
      nutritionix: {
        count: nutritionixResults.length,
        results: nutritionixResults.slice(0, 3)
      },
      usda: {
        count: usdaResults.length,
        results: usdaResults.slice(0, 3)
      },
      spoonacular: {
        count: spoonacularResults.length,
        results: spoonacularResults.slice(0, 3)
      }
    });
  } catch (error) {
    logger.error('Debug search error:', error);
    res.status(500).json({ message: 'Error in debug search', error: error.message });
  }
});

/**
 * Search food items
 * @route GET /api/foods/search
 */
const searchFood = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  try {
    logger.info(`Search request with limit: ${limit}, page: ${page}, offset: ${offset}`);

    // Search local database and external APIs in parallel
    const [localResults, apiResults] = await Promise.all([
      FoodItem.search(query, limit, offset),
      FoodApiService.searchFood(query)
    ]);

    logger.info(`Local results: ${localResults.length}, API results: ${apiResults.length}`);

    // Filter out items that are already in local results
    const localSourceIds = new Set(localResults.map(item => `${item.source}:${item.source_id}`));
    const filteredApiResults = apiResults.filter(item =>
      !localSourceIds.has(`${item.source}:${item.source_id}`)
    );

    // Combine results with local results first, then add API results up to the limit
    const combinedResults = [...localResults];
    const remainingSlots = limit - localResults.length;

    if (remainingSlots > 0 && filteredApiResults.length > 0) {
      // Add API results up to the remaining slots
      // The API results are already sorted by relevance by FoodApiService.deduplicateResults
      const apiResultsToAdd = filteredApiResults.slice(0, remainingSlots);
      combinedResults.push(...apiResultsToAdd);
    }

    res.json({
      foods: combinedResults,
      page,
      limit,
      source: 'combined',
      total_local: localResults.length,
      total_api: filteredApiResults.length
    });
  } catch (error) {
    logger.error(`Error searching foods: ${error.message}`);
    res.status(500).json({ message: 'Error searching foods', error: error.message });
  }
});

/**
 * Get food item by barcode
 * @route GET /api/foods/barcode/:barcode
 */
const getFoodByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  // First check local database
  let foodItem = await FoodItem.findByBarcode(barcode);

  if (foodItem) {
    return res.json({ food: foodItem, source: 'local' });
  }

  // If not found locally, search external APIs
  const apiFood = await FoodApiService.fetchFoodByBarcode(barcode);

  if (!apiFood) {
    return res.status(404).json({ message: 'Food item not found' });
  }

  // Save to local database
  try {
    foodItem = await FoodItem.create(apiFood);
    res.json({ food: foodItem, source: 'api' });
  } catch (error) {
    // If there's an error saving to database, still return the API result
    logger.error(`Error saving food item to database: ${error.message}`);
    res.json({ food: apiFood, source: 'api', saved: false });
  }
});

/**
 * Create custom food item
 * @route POST /api/foods/custom
 */
const createCustomFood = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    name,
    calories,
    protein,
    carbs,
    fat,
    serving_size,
    serving_unit,
    barcode,
    brand
  } = req.body;

  // Check for existing food with same name or barcode
  let existingFood = null;

  // First check by barcode if provided
  if (barcode) {
    logger.debug(`Checking for existing food with barcode: ${barcode}`);
    try {
      existingFood = await FoodItem.findByBarcode(barcode);
      if (existingFood) {
        logger.info(`Found existing food with barcode ${barcode}: ${existingFood.name} (ID: ${existingFood.id})`);
      }
    } catch (error) {
      logger.error(`Error checking food by barcode: ${error.message}`);
      // Continue with the creation process even if barcode check fails
    }
  }

  // If no existing food found by barcode, check by name similarity
  if (!existingFood && name) {
    logger.debug(`Checking for existing food with similar name: ${name}`);
    try {
      // Find foods with similar name (case insensitive)
      const similarNameFoods = await FoodItem.findByPartialName(name);

      if (similarNameFoods && similarNameFoods.length > 0) {
        // Find exact name match first (case insensitive)
        existingFood = similarNameFoods.find(food =>
          food.name.toLowerCase() === name.toLowerCase() &&
          food.user_id === req.user.id
        );

        if (existingFood) {
          logger.info(`Found existing food with exact name match: ${existingFood.name} (ID: ${existingFood.id})`);
        } else {
          // Log similar foods for debugging
          logger.debug(`Found ${similarNameFoods.length} foods with similar names but no exact match`);
        }
      }
    } catch (error) {
      logger.error(`Error checking food by name: ${error.message}`);
      // Continue with the creation process even if name check fails
    }
  }

  // If we found an existing food, return it instead of creating a new one
  if (existingFood) {
    logger.info(`Returning existing food instead of creating duplicate: ${existingFood.id}`);

    // Update the existing food with any new information
    const updatedData = {
      calories_per_serving: calories !== undefined ? calories : existingFood.calories_per_serving,
      protein_grams: protein !== undefined ? protein : existingFood.protein_grams,
      carbs_grams: carbs !== undefined ? carbs : existingFood.carbs_grams,
      fat_grams: fat !== undefined ? fat : existingFood.fat_grams,
      serving_size: serving_size || existingFood.serving_size,
      serving_unit: serving_unit || existingFood.serving_unit,
      barcode: barcode || existingFood.barcode,
      brand: brand || existingFood.brand
    };

    try {
      // Only update if this is the user's own food
      let updatedFood;
      if (existingFood.user_id === req.user.id) {
        updatedFood = await FoodItem.update(existingFood.id, updatedData, req.user.id);
      } else if (existingFood.source === 'custom') {
        // Use the new method for updating any custom food
        updatedFood = await FoodItem.updateAnyCustomFood(existingFood.id, updatedData, req.user.id);
      }

      if (updatedFood) {
        // Invalidate caches after updating food
        await invalidateFoodCaches();

        return res.status(200).json({
          message: 'Using existing food item with updated information',
          food: updatedFood,
          existing: true
        });
      }
    } catch (updateError) {
      logger.error(`Error updating existing food: ${updateError.message}`);
      // If update fails, we'll still return the existing food without changes
    }

    return res.status(200).json({
      message: 'Using existing food item',
      food: existingFood,
      existing: true
    });
  }

  // Generate a truly unique source_id
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const uniqueSourceId = `custom-${req.user.id}-${timestamp}-${randomStr}`;

  // Create food item
  const foodItem = await FoodItem.create({
    name,
    barcode,
    brand,
    calories_per_serving: calories,
    protein_grams: protein,
    carbs_grams: carbs,
    fat_grams: fat,
    serving_size,
    serving_unit,
    source: 'custom',
    source_id: uniqueSourceId,
    user_id: req.user.id,
  });

  // Invalidate caches after creating new food
  await invalidateFoodCaches();

  res.status(201).json({
    message: 'Custom food item created',
    food: foodItem,
  });
});

/**
 * Update custom food item
 * @route PUT /api/foods/custom/:id
 */
const updateCustomFood = asyncHandler(async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.debug('Validation failed:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Check if this is a soft delete request
    if (req.body.hasOwnProperty('is_deleted') && Object.keys(req.body).length === 1) {
      logger.debug(`Processing soft delete request - ID: ${id}, UserID: ${userId}`);

      const isDeleted = req.body.is_deleted === true || req.body.is_deleted === 'true';
      const food = await FoodItem.findById(id);

      if (!food) {
        return res.status(404).json({ message: 'Food item not found' });
      }

      // If the user owns the food item or the item is not custom, use the regular update
      // Otherwise, use the new method to update any custom food
      try {
        let updatedFood;

        if (food.user_id === userId) {
          // User owns this food item, use regular update
          updatedFood = await FoodItem.update(id, { is_deleted: isDeleted }, userId);
        } else if (food.source === 'custom') {
          // User doesn't own this food, but it's a custom food so allow update
          updatedFood = await FoodItem.updateAnyCustomFood(id, { is_deleted: isDeleted }, userId);
        } else {
          // Not a custom food and user doesn't own it
          return res.status(403).json({ message: 'Not authorized to update this food item' });
        }

        if (!updatedFood) {
          return res.status(404).json({ message: 'Food item not found or update failed' });
        }

        // Invalidate caches after updating food
        await invalidateFoodCaches();

        logger.debug(`Successfully soft deleted food item ${id}`);
        return res.json({ message: 'Food item updated successfully', food: updatedFood });
      } catch (updateError) {
        logger.error('Error during soft delete:', updateError);
        throw updateError;
      }
    }

    // Regular update
    logger.debug(`Processing regular update - ID: ${id}, UserID: ${userId}`);

    const food = await FoodItem.findById(id);
    if (!food) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Changed: Allow any user to update any custom food
    let updatedFood;

    if (food.user_id === userId) {
      // User owns this food item, use regular update
      updatedFood = await FoodItem.update(id, req.body, userId);
    } else if (food.source === 'custom') {
      // User doesn't own this food, but it's a custom food so allow update
      logger.info(`User ${userId} is updating custom food ${id} owned by user ${food.user_id}`);
      updatedFood = await FoodItem.updateAnyCustomFood(id, req.body, userId);
    } else {
      // Not a custom food and user doesn't own it
      return res.status(403).json({ message: 'Not authorized to update this food item' });
    }

    if (!updatedFood) {
      return res.status(404).json({ message: 'Food item not found or update failed' });
    }

    // Invalidate caches after updating food
    await invalidateFoodCaches();

    logger.debug(`Successfully updated food item ${id}`);
    res.json({ message: 'Food item updated successfully', food: updatedFood });
  } catch (error) {
    logger.error('Error in updateCustomFood:', error);
    logger.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Delete custom food item
 * @route DELETE /api/foods/custom/:id
 */
const deleteCustomFood = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.debug(`Delete request - ID: ${id}, UserID: ${userId}`);

    if (!id || !userId) {
      logger.debug('Missing required parameters:', { id, userId });
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Check if food item exists and belongs to user
    const foodItem = await FoodItem.findById(id);

    logger.debug('Found food item:', foodItem);

    if (!foodItem) {
      logger.debug(`Food item ${id} not found`);
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Check if it's a custom food item
    if (foodItem.source !== 'custom') {
      logger.debug(`Food item ${id} is not a custom food item (source: ${foodItem.source})`);
      return res.status(403).json({ message: 'Only custom food items can be deleted' });
    }

    // Changed: Allow any user to delete any custom food
    // No longer checking if the food item belongs to the user

    // Check if the food item has any associated logs
    const hasLogs = await FoodItem.hasAssociatedLogs(id);
    logger.debug(`Food item ${id} has logs:`, hasLogs);

    if (hasLogs) {
      logger.debug(`Food item ${id} has associated logs, cannot delete`);
      return res.status(400).json({
        message: 'Cannot delete food item that has associated logs. Consider marking it as deleted instead.'
      });
    }

    // Delete food item
    logger.debug(`Attempting to delete food item ${id}`);
    let success;

    if (foodItem.user_id === userId) {
      // User owns this food item, use regular delete
      success = await FoodItem.delete(id, userId);
    } else {
      // User doesn't own this food, but allow deletion of custom foods
      logger.info(`User ${userId} is deleting custom food ${id} owned by user ${foodItem.user_id}`);
      success = await FoodItem.deleteAnyCustomFood(id, userId);
    }

    if (!success) {
      logger.debug(`Failed to delete food item ${id}`);
      return res.status(500).json({
        message: 'Failed to delete food item',
        details: 'The database operation did not affect any rows'
      });
    }

    // Invalidate caches after deleting food
    await invalidateFoodCaches();

    logger.debug(`Successfully deleted food item ${id}`);
    res.json({
      message: 'Food item deleted',
      id: id,
      success: true
    });
  } catch (error) {
    logger.error('Error deleting custom food:', error);
    logger.error('Stack trace:', error.stack);
    res.status(500).json({
      message: 'Server error while deleting food item',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      details: 'An unexpected error occurred during the deletion process'
    });
  }
});

/**
 * Get custom food items
 * @route GET /api/foods/custom
 */
const getCustomFoods = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const includeAllUsers = req.query.all === 'true';

  let customFoods;

  if (includeAllUsers) {
    // Get custom foods from all users
    logger.debug(`Getting all users' custom foods - Page: ${page}, Limit: ${limit}`);
    customFoods = await FoodItem.getAllCustomFoods(limit, offset);
  } else {
    // Get only the current user's custom foods
    logger.debug(`Getting user ${req.user.id}'s custom foods - Page: ${page}, Limit: ${limit}`);
    customFoods = await FoodItem.getCustomFoods(req.user.id, limit, offset);
  }

  res.json({
    foods: customFoods,
    page,
    limit,
    all_users: includeAllUsers
  });
});

/**
 * Get recently used food items
 * @route GET /api/foods/recent
 */
const getRecentFoods = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  try {
    let query;
    let params;

    logger.info(`getRecentFoods called - User authenticated: ${!!req.user}, User ID: ${req.user?.id}`);

    if (req.user && req.user.id) {
      // If authenticated, get user-specific foods and all custom foods
      query = `
        WITH LastUsed AS (
          SELECT food_item_id,
                 MAX(created_at) as last_used
          FROM food_logs
          WHERE user_id = $1
          GROUP BY food_item_id
        )
        SELECT DISTINCT f.*, lu.last_used
        FROM food_items f
        LEFT JOIN LastUsed lu ON f.id = lu.food_item_id
        WHERE f.is_deleted = FALSE
          AND (f.user_id = $1 OR f.source = 'custom' OR f.source = 'recipe')
        ORDER BY lu.last_used DESC NULLS LAST, f.created_at DESC
        LIMIT $2
      `;
      params = [req.user.id, limit];
      logger.info('Using authenticated query with params:', params);
    } else {
      // If not authenticated, get all custom foods and recipes
      query = `
        SELECT DISTINCT f.*
        FROM food_items f
        WHERE f.is_deleted = FALSE
          AND (f.source = 'custom' OR f.source = 'recipe')
        ORDER BY f.created_at DESC
        LIMIT $1
      `;
      params = [limit];
      logger.info('Using public foods query with params:', params);
    }

    logger.info('Executing query:', { query, params });
    const result = await db.query(query, params);
    logger.info(`Query results: ${result.rows.length} rows found`);

    if (result.rows.length === 0) {
      logger.info('No food items found in query result');
    } else {
      logger.info('Raw database results:', JSON.stringify(result.rows, null, 2));
      logger.info('First food item raw:', result.rows[0]);
    }

    const foods = result.rows.map(row => {
      const transformed = FoodItem.transformToFrontend(row);
      logger.info('Raw row:', row);
      logger.info('Transformed food item:', transformed);
      return transformed;
    });

    res.json({
      foods,
      total: foods.length
    });
  } catch (error) {
    logger.error(`Error getting recent foods: ${error.message}`);
    logger.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Error getting recent foods', error: error.message });
  }
});

/**
 * Get recipe-based food items
 * @route GET /api/foods/recipes
 */
const getRecipeFoods = asyncHandler(async (req, res) => {
  try {
    // Query directly instead of using findAll for simplicity
    const userId = req.user.id;
    logger.info(`Getting recipe-based foods for user ${userId}`);

    // Direct SQL query instead of using model method
    const result = await db.query(
      `SELECT f.*
       FROM food_items f
       WHERE f.user_id = $1
       AND f.source = 'recipe'
       AND f.is_deleted = false
       ORDER BY f.name ASC`,
      [userId]
    );

    logger.info(`Found ${result.rows.length} recipe-based foods`);

    // Transform to frontend format
    const foods = result.rows.map(row => FoodItem.transformToFrontend(row));

    res.json({
      foods,
      total: foods.length,
      page: 1,
      limit: foods.length
    });
  } catch (error) {
    logger.error('Error fetching recipe foods:', error);
    res.status(500).json({ message: 'Error fetching recipe foods' });
  }
});

module.exports = {
  searchFood,
  getFoodByBarcode,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  getCustomFoods,
  debugSearch,
  getRecentFoods,
  getRecipeFoods
};