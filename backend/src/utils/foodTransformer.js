const Food = require('../models/Food');

class FoodTransformer {
  static toFoodModel(data, source) {
    const food = new Food({
      name: data.name || data.description || data.food_name,
      source,
      source_id: data.id || data.fdcId || data._id || data.food_id,
      calories: data.calories || data.energy || data.kcal || data.nf_calories,
      protein: data.protein || data.proteins || data.nf_protein,
      carbs: data.carbs || data.carbohydrates || data.nf_total_carbohydrate,
      fat: data.fat || data.lipids || data.nf_total_fat,
      serving_size: data.serving_size || data.portion || data.serving_qty,
      serving_unit: data.serving_unit || data.unit || data.serving_unit,
      brand: data.brand || data.brandName || data.brandOwner || data.brand_name,
      barcode: data.barcode || data.upc || data.gtin || data.nf_upc,
      is_local: source === 'local'
    });

    return food;
  }

  static transformApiResponse(data, source) {
    if (!data) return [];

    // Handle different API response formats
    const items = Array.isArray(data) ? data :
                 data.foods ? data.foods :
                 data.results ? data.results :
                 [data];

    return items.map(item => this.toFoodModel(item, source));
  }
}

module.exports = FoodTransformer;