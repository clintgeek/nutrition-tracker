const express = require('express');
const { check } = require('express-validator');
const {
  searchFood,
  getFoodByBarcode,
  createCustomFood,
  updateCustomFood,
  deleteCustomFood,
  getCustomFoods,
} = require('../controllers/foodController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/foods/search
 * @desc Search food items
 * @access Public
 */
router.get('/search', searchFood);

/**
 * @route GET /api/foods/barcode/:barcode
 * @desc Get food item by barcode
 * @access Public
 */
router.get('/barcode/:barcode', getFoodByBarcode);

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
    check('calories_per_serving', 'Calories must be a number').isNumeric(),
    check('protein_grams', 'Protein must be a number').isNumeric(),
    check('carbs_grams', 'Carbs must be a number').isNumeric(),
    check('fat_grams', 'Fat must be a number').isNumeric(),
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
    check('name', 'Name is required').not().isEmpty(),
    check('calories_per_serving', 'Calories must be a number').isNumeric(),
    check('protein_grams', 'Protein must be a number').isNumeric(),
    check('carbs_grams', 'Carbs must be a number').isNumeric(),
    check('fat_grams', 'Fat must be a number').isNumeric(),
    check('serving_size', 'Serving size is required').not().isEmpty(),
    check('serving_unit', 'Serving unit is required').not().isEmpty(),
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

module.exports = router;