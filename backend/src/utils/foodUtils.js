const FOOD_CONSTANTS = require('./foodConstants');
const logger = require('./logger');

const FoodUtils = {
  convertUnit(value, fromUnit, toUnit) {
    const conversion = FOOD_CONSTANTS.UNIT_CONVERSIONS[fromUnit];
    return conversion ? value * conversion.factor : value;
  },

  calculateNutritionScore(nutrition) {
    return Object.entries(FOOD_CONSTANTS.NUTRITION_WEIGHTS)
      .reduce((score, [key, weight]) =>
        score + (nutrition[key] > 0 ? weight : 0), 0);
  },

  isReasonableServing(size, unit) {
    const limits = FOOD_CONSTANTS.REASONABLE_SERVINGS[unit];
    return limits ? size >= limits.min && size <= limits.max : true;
  },

  getSourcePriority(source) {
    return FOOD_CONSTANTS.SOURCE_PRIORITY[source] || 0;
  },

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const normalize = str => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
    const s1 = normalize(str1);
    const s2 = normalize(str2);

    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.7 + (Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length) * 0.3);
    }

    // Use a simpler similarity algorithm for non-exact matches
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    return intersection.size / Math.max(words1.size, words2.size);
  },

  async fetchWithTimeout(url, options = {}) {
    try {
      const response = await axios.get(url, {
        ...options,
        timeout: FOOD_CONSTANTS.API_TIMEOUT
      });
      return response;
    } catch (error) {
      logger.error(`Fetch error for ${url}: ${error.message}`);
      throw error;
    }
  }
};

module.exports = FoodUtils;