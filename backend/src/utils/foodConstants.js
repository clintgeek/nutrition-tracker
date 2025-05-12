const FOOD_CONSTANTS = {
  SOURCE_PRIORITY: {
    local: 5,
    nutritionix: 4,
    usda: 4,
    spoonacular: 2,
    openFoodFacts: 1
  },

  UNIT_CONVERSIONS: {
    g: { unit: 'oz', factor: 0.035274 },
    kg: { unit: 'lb', factor: 2.20462 },
    ml: { unit: 'fl oz', factor: 0.033814 },
    l: { unit: 'cup', factor: 4.22675 }
  },

  REASONABLE_SERVINGS: {
    oz: { min: 0.5, max: 16 },
    lb: { min: 0.1, max: 1.5 },
    cup: { min: 0.25, max: 4 },
    'fl oz': { min: 1, max: 32 }
  },

  NUTRITION_WEIGHTS: {
    calories: 10,
    protein: 8,
    carbs: 8,
    fat: 8
  },

  API_TIMEOUT: 10000, // 10 seconds
  CACHE_TTL: 5 * 60 * 1000 // 5 minutes
};

module.exports = FOOD_CONSTANTS;