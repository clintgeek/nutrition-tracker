const FOOD_CONSTANTS = require('../utils/foodConstants');
const FoodUtils = require('../utils/foodUtils');

class Food {
  constructor(data = {}) {
    // Required fields
    this.name = data.name || '';
    this.source = data.source || '';
    this.source_id = data.source_id || '';

    // Nutritional values (all optional)
    this.calories = data.calories || 0;
    this.protein = data.protein || 0;
    this.carbs = data.carbs || 0;
    this.fat = data.fat || 0;

    // Serving information
    this.serving_size = data.serving_size || 0;
    this.serving_unit = data.serving_unit || 'g';

    // Optional metadata
    this.brand = data.brand || null;
    this.barcode = data.barcode || null;

    // Quality metrics
    this.quality_score = 0;
    this.data_completeness = 0;
    this.is_local = data.is_local || false;

    // Initialize quality metrics
    this.calculateDataCompleteness();
    this.convertToImperial();
    this.calculateQualityScore();
  }

  convertToImperial() {
    const conversion = FOOD_CONSTANTS.UNIT_CONVERSIONS[this.serving_unit.toLowerCase()];
    if (conversion) {
      this.serving_size = Number((this.serving_size * conversion.factor).toFixed(2));
      this.serving_unit = conversion.unit;
    }
  }

  calculateDataCompleteness() {
    const requiredFields = ['name', 'calories', 'protein', 'carbs', 'fat', 'serving_size'];
    const presentFields = requiredFields.filter(field => this[field] && this[field] > 0);
    this.data_completeness = presentFields.length / requiredFields.length;
  }

  isReasonableServing() {
    return FoodUtils.isReasonableServing(this.serving_size, this.serving_unit);
  }

  calculateQualityScore() {
    let score = 0;

    // Base score from data completeness
    score += this.data_completeness * 5;

    // Source reliability bonus
    score += FoodUtils.getSourcePriority(this.source);

    // Serving size bonus
    if (this.isReasonableServing()) {
      score += 2;
    }

    // Brand and barcode bonus
    if (this.brand) score += 1;
    if (this.barcode) score += 1;

    // Local food bonus
    if (this.is_local) score += 3;

    this.quality_score = Math.min(10, score);
  }

  toFrontendFormat() {
    return {
      name: this.name,
      brand: this.brand,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fat: this.fat,
      serving_size: this.serving_size,
      serving_unit: this.serving_unit,
      source: this.source,
      source_id: this.source_id,
      barcode: this.barcode,
      quality_score: this.quality_score,
      data_completeness: this.data_completeness
    };
  }
}

module.exports = Food;