const { validationResult } = require('express-validator');
const FoodItem = require('../models/FoodItem');
const FoodApiService = require('../utils/foodApiService');
const nutritionixService = require('../utils/nutritionixService');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

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
      FoodApiService.searchOpenFoodFacts(query).catch(error => {
        logger.error(`OpenFoodFacts search error: ${error.message}`);
        return [];
      }),
      FoodApiService.searchUSDAByName(query, true).catch(error => {
        logger.error(`USDA search error: ${error.message}`);
        return [];
      }),
      nutritionixService.searchByName(query).catch(error => {
        logger.error(`Nutritionix search error: ${error.message}`);
        return [];
      })
    ];

    // Wait for all searches to complete
    const [openFoodResults, usdaResults, nutritionixResults] = await Promise.all(searches);

    res.json({
      openFoodFacts: {
        count: openFoodResults.length,
        results: openFoodResults.slice(0, 3)
      },
      usda: {
        count: usdaResults.length,
        results: usdaResults.slice(0, 3)
      },
      nutritionix: {
        count: nutritionixResults.length,
        results: nutritionixResults.slice(0, 3)
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

  // Create food item
  const foodItem = await FoodItem.create({
    name,
    barcode,
    brand,
    calories,
    protein,
    carbs,
    fat,
    serving_size,
    serving_unit,
    source: 'custom',
    source_id: `custom-${req.user.id}-${Date.now()}`,
    user_id: req.user.id,
  });

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
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  // Check if food item exists
  const foodItem = await FoodItem.findById(id);

  if (!foodItem) {
    return res.status(404).json({ message: 'Food item not found' });
  }

  // Check if it's a custom food item
  if (foodItem.source !== 'custom') {
    return res.status(403).json({ message: 'Only custom food items can be updated' });
  }

  // Update food item
  const updatedFoodItem = await FoodItem.update(id, {
    ...req.body,
    source: 'custom',  // Ensure source remains 'custom'
    source_id: foodItem.source_id  // Preserve the original source_id
  });

  res.json({
    message: 'Food item updated',
    food: updatedFoodItem,
  });
});

/**
 * Delete custom food item
 * @route DELETE /api/foods/custom/:id
 */
const deleteCustomFood = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if food item exists
  const foodItem = await FoodItem.findById(id);

  if (!foodItem) {
    return res.status(404).json({ message: 'Food item not found' });
  }

  // Check if it's a custom food item
  if (foodItem.source !== 'custom') {
    return res.status(403).json({ message: 'Only custom food items can be deleted' });
  }

  // Check if the food item has any associated logs
  const hasLogs = await FoodItem.hasAssociatedLogs(id);
  if (hasLogs) {
    return res.status(400).json({
      message: 'Cannot delete food item that has associated logs. Consider marking it as deleted instead.'
    });
  }

  // Delete food item
  const success = await FoodItem.delete(id);

  if (!success) {
    return res.status(500).json({ message: 'Failed to delete food item' });
  }

  res.json({ message: 'Food item deleted' });
});

/**
 * Get custom food items
 * @route GET /api/foods/custom
 */
const getCustomFoods = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const customFoods = await FoodItem.getCustomFoods(req.user.id, limit, offset);

  res.json({
    foods: customFoods,
    page,
    limit,
  });
});

module.exports = {
  searchFood,
  getFoodByBarcode,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  getCustomFoods,
  debugSearch,
};