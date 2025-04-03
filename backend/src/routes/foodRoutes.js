const express = require('express');
const { check } = require('express-validator');
const logger = require('../config/logger');
const {
  searchFood,
  getFoodByBarcode,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  getCustomFoods,
  debugSearch,
  getRecentFoods,
  getRecipeFoods,
} = require('../controllers/foodController');
const { authenticate } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const FoodItem = require('../models/FoodItem');

const router = express.Router();

// Debug logging for route registration
logger.info('Registering food routes...');

// Validation middleware for regular food updates
const validateFoodUpdate = [
  check('name', 'Name is required').not().isEmpty(),
  check('calories_per_serving', 'Calories must be a number').isNumeric(),
  check('protein_grams', 'Protein must be a number').isNumeric(),
  check('carbs_grams', 'Carbs must be a number').isNumeric(),
  check('fat_grams', 'Fat must be a number').isNumeric(),
  check('serving_size', 'Serving size is required').not().isEmpty(),
  check('serving_unit', 'Serving unit is required').not().isEmpty(),
];

// Validation middleware for soft deletion
const validateSoftDelete = [
  check('is_deleted', 'is_deleted must be a boolean').isBoolean()
];

// Debug middleware to log all requests
const logRequests = (req, res, next) => {
  logger.info(`Food route accessed: ${req.method} ${req.originalUrl}`);
  next();
};

router.use(logRequests);

/**
 * @route GET /api/foods/search
 * @desc Search food items
 * @access Public
 */
router.get('/search', cacheMiddleware({ ttl: 3600, keyPrefix: 'food-search' }), searchFood);

/**
 * @route GET /api/foods/debug-search
 * @desc Debug endpoint to check raw API results
 * @access Public
 */
router.get('/debug-search', cacheMiddleware({ ttl: 3600, keyPrefix: 'food-debug-search' }), debugSearch);

/**
 * @route GET /api/foods/barcode/:barcode
 * @desc Get food item by barcode
 * @access Public
 */
router.get('/barcode/:barcode', cacheMiddleware({ ttl: 86400, keyPrefix: 'food-barcode' }), getFoodByBarcode);

/**
 * @route GET /api/foods/recent
 * @desc Get recently used food items
 * @access Private
 */
router.get('/recent', (req, res, next) => {
  logger.info('Recent foods route accessed');
  next();
}, authenticate, getRecentFoods);

// All routes below require authentication
router.use(authenticate);

/**
 * @route POST /api/foods/custom
 * @desc Create custom food item
 * @access Private
 */
router.post(
  '/custom',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('calories', 'Calories must be a positive number').isFloat({ min: 0 }),
    check('protein', 'Protein must be a non-negative number').isFloat({ min: 0 }),
    check('carbs', 'Carbs must be a non-negative number').isFloat({ min: 0 }),
    check('fat', 'Fat must be a non-negative number').isFloat({ min: 0 }),
    check('serving_size', 'Serving size is required').not().isEmpty(),
    check('serving_unit', 'Serving unit is required').not().isEmpty(),
  ],
  createCustomFood
);

/**
 * @route PUT /api/foods/custom/:id
 * @desc Update custom food item
 * @access Private
 */
router.put(
  '/custom/:id',
  [
    check('is_deleted').optional().isBoolean().withMessage('is_deleted must be a boolean'),
    check('name').optional().not().isEmpty().withMessage('Name cannot be empty'),
    check('calories_per_serving').optional().isNumeric().withMessage('Calories must be a number'),
    check('protein_grams').optional().isNumeric().withMessage('Protein must be a number'),
    check('carbs_grams').optional().isNumeric().withMessage('Carbs must be a number'),
    check('fat_grams').optional().isNumeric().withMessage('Fat must be a number'),
    check('serving_size').optional().not().isEmpty().withMessage('Serving size cannot be empty'),
    check('serving_unit').optional().not().isEmpty().withMessage('Serving unit cannot be empty'),
  ],
  updateCustomFood
);

/**
 * @route DELETE /api/foods/custom/:id
 * @desc Delete custom food item
 * @access Private
 */
router.delete('/custom/:id', deleteCustomFood);

/**
 * @route GET /api/foods/custom
 * @desc Get custom food items
 * @access Private
 */
router.get('/custom', getCustomFoods);

/**
 * @route GET /api/foods/recipes
 * @desc Get recipe-based food items
 * @access Private
 */
router.get('/recipes', getRecipeFoods);

/**
 * @route GET /api/foods/exists
 * @desc Check if a food exists by barcode or name
 * @access Private
 */
router.get('/exists', authenticate, async (req, res) => {
  try {
    const { barcode, name } = req.query;

    logger.info(`Checking if food exists - barcode: ${barcode}, name: ${name}`);

    if (!barcode && !name) {
      return res.status(400).json({ message: 'Either barcode or name must be provided' });
    }

    let existingFood = null;

    // First check by barcode if provided
    if (barcode) {
      existingFood = await FoodItem.findByBarcode(barcode);
      if (existingFood) {
        logger.info(`Found existing food by barcode: ${existingFood.id}`);
        return res.json({ exists: true, food: existingFood });
      }
    }

    // Then check by name if provided
    if (name && !existingFood) {
      const similarFoods = await FoodItem.findByPartialName(name);
      const exactMatch = similarFoods.find(food =>
        food.name.toLowerCase().trim() === name.toLowerCase().trim()
      );

      if (exactMatch) {
        logger.info(`Found existing food by exact name: ${exactMatch.id}`);
        existingFood = exactMatch;
        return res.json({ exists: true, food: existingFood });
      }

      // Return similar foods for reference
      if (similarFoods.length > 0) {
        logger.info(`Found ${similarFoods.length} similar foods by name`);
        return res.json({
          exists: false,
          similarFoods: similarFoods.slice(0, 5) // Return up to 5 similar foods
        });
      }
    }

    // No matching food found
    logger.info('No matching food found');
    return res.json({ exists: false });
  } catch (error) {
    logger.error('Error checking if food exists:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;