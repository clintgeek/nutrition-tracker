const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validateRecipe } = require('../middleware/validation');
const recipeController = require('../controllers/recipeController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Recipe CRUD operations
router.get('/', recipeController.getRecipes);
router.get('/:id', recipeController.getRecipe);
router.post('/', validateRecipe, recipeController.createRecipe);
router.put('/:id', validateRecipe, recipeController.updateRecipe);
router.delete('/:id', recipeController.deleteRecipe);

// Recipe conversion
router.post('/:id/convert', recipeController.convertToFoodItem);

// Ingredient order management
router.put('/:id/ingredients/order', recipeController.updateIngredientOrder);

module.exports = router;