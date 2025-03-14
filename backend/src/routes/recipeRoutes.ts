import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateRecipe } from '../middleware/validation';
import * as recipeController from '../controllers/recipeController';

const router = Router();

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

export default router;