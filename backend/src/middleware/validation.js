function validateRecipe(req, res, next) {
  const data = req.body;
  const errors = [];

  // For POST requests (create), validate all required fields
  if (req.method === 'POST') {
    if (!data.name?.trim()) {
      errors.push('Recipe name is required');
    }
    if (typeof data.servings !== 'number' || data.servings < 1) {
      errors.push('Recipe servings must be a positive number');
    }
    if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
      errors.push('Recipe must have at least one ingredient');
    }
  }

  // For both POST and PUT, validate ingredient format if present
  if (data.ingredients) {
    if (!Array.isArray(data.ingredients)) {
      errors.push('Ingredients must be an array');
    } else {
      data.ingredients.forEach((ing, index) => {
        if (!ing.food_item_id || typeof ing.food_item_id !== 'number') {
          errors.push(`Ingredient ${index + 1}: food_item_id must be a number`);
        }
        if (!ing.amount || typeof ing.amount !== 'number' || ing.amount <= 0) {
          errors.push(`Ingredient ${index + 1}: amount must be a positive number`);
        }
        if (ing.unit && typeof ing.unit !== 'string') {
          errors.push(`Ingredient ${index + 1}: unit must be a string`);
        }
      });
    }
  }

  // For PUT requests (update), validate that at least one field is being updated
  if (req.method === 'PUT') {
    if (!data.name && !data.description && !data.servings && !data.ingredients) {
      errors.push('At least one field must be provided for update');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

module.exports = {
  validateRecipe
};