const { validationResult } = require('express-validator');
const FoodItem = require('../models/FoodItem');
const FoodApiService = require('../utils/foodApiService');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Search food items
 * @route GET /api/foods/search
 */
const searchFood = asyncHandler(async (req, res) => {
  const { query } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  if (!query || query.length < 2) {
    return res.status(400).json({ message: 'Search query must be at least 2 characters' });
  }

  // First search local database
  const localResults = await FoodItem.search(query, limit, offset);

  // If we have enough local results, return them
  if (localResults.length >= limit) {
    return res.json({
      foods: localResults,
      page,
      limit,
      source: 'local',
    });
  }

  // Otherwise, search external APIs
  const apiResults = await FoodApiService.searchFood(query);

  // Filter out items that are already in local results (by source and source_id)
  const localSourceIds = localResults.map(item => `${item.source}:${item.source_id}`);
  const filteredApiResults = apiResults.filter(item =>
    !localSourceIds.includes(`${item.source}:${item.source_id}`)
  );

  // Combine results, respecting the limit
  const combinedResults = [...localResults];
  const remainingSlots = limit - localResults.length;

  if (remainingSlots > 0 && filteredApiResults.length > 0) {
    combinedResults.push(...filteredApiResults.slice(0, remainingSlots));
  }

  res.json({
    foods: combinedResults,
    page,
    limit,
    source: 'combined',
  });
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
    calories_per_serving,
    protein_grams,
    carbs_grams,
    fat_grams,
    serving_size,
    serving_unit,
    source,
    source_id
  } = req.body;

  // Create food item
  const foodItem = await FoodItem.create({
    name,
    barcode: null,
    calories_per_serving,
    protein_grams,
    carbs_grams,
    fat_grams,
    serving_size,
    serving_unit,
    source: source || 'custom',
    source_id: source_id || `custom-${req.user.id}-${Date.now()}`,
    user_id: req.user.id,
  });

  // Ensure we have all required fields in the response
  const responseFood = {
    id: foodItem.id,
    name: foodItem.name,
    calories_per_serving: foodItem.calories_per_serving,
    protein_grams: foodItem.protein_grams,
    carbs_grams: foodItem.carbs_grams,
    fat_grams: foodItem.fat_grams,
    serving_size: foodItem.serving_size,
    serving_unit: foodItem.serving_unit,
    source: foodItem.source,
    source_id: foodItem.source_id
  };

  res.status(201).json({
    message: 'Custom food item created',
    food: responseFood,
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
  const updatedFoodItem = await FoodItem.update(id, req.body);

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
};