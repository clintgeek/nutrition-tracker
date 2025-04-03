const axios = require('axios');
const logger = require('./logger');
const nutritionixService = require('./nutritionixService');
const spoonacularService = require('./spoonacularService');

// Keep only USDA API URL and remove OpenFoodFacts URLs
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

// Debug logging for environment variables
console.log('Environment variables:', {
  USDA_API_KEY: process.env.USDA_API_KEY ? 'Present' : 'Missing',
  NUTRITIONIX_APP_ID: process.env.NUTRITIONIX_APP_ID ? 'Present' : 'Missing',
  NUTRITIONIX_API_KEY: process.env.NUTRITIONIX_API_KEY ? 'Present' : 'Missing',
  SPOONACULAR_API_KEY: process.env.SPOONACULAR_API_KEY ? 'Present' : 'Missing'
});

// Additional debug logging for Spoonacular API key
console.log('Spoonacular API Key first 10 chars:', process.env.SPOONACULAR_API_KEY ?
  process.env.SPOONACULAR_API_KEY.substring(0, 10) + '...' : 'Missing');

const API_TIMEOUT = 10000; // 10 seconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Simple in-memory cache
const cache = {
  data: new Map(),
  timestamps: new Map(),
};

// Cache cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of cache.timestamps.entries()) {
    if (now - timestamp > CACHE_TTL) {
      cache.data.delete(key);
      cache.timestamps.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Get cached data if available and not expired
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
function getCachedData(key) {
  const timestamp = cache.timestamps.get(key);
  if (timestamp && Date.now() - timestamp <= CACHE_TTL) {
    return cache.data.get(key);
  }
  return null;
}

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
function setCacheData(key, data) {
  cache.data.set(key, data);
  cache.timestamps.set(key, Date.now());
}

/**
 * Wrapper for fetch with timeout
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} Response
 */
async function fetchWithTimeout(url, options = {}) {
  try {
    const response = await axios.get(url, {
      ...options,
      timeout: API_TIMEOUT
    });
    return response;
  } catch (error) {
    logger.error(`Fetch error for ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Food API Service for external food database APIs
 */
class FoodApiService {
  /**
   * Transform external API data to our frontend format
   * @param {Object} apiData - Raw API data
   * @returns {Object} Transformed food data
   */
  static transformExternalData(apiData) {
    return {
      name: apiData.name || apiData.product_name || apiData.food_name || '',
      barcode: apiData.barcode || apiData.code || apiData.upc || null,
      calories: Math.round(parseFloat(apiData.calories || apiData.energy_kcal || apiData.nutriments?.energy_kcal || 0)),
      protein: Number((parseFloat(apiData.protein || apiData.proteins || apiData.nutriments?.proteins_100g || 0)).toFixed(1)),
      carbs: Number((parseFloat(apiData.carbohydrates || apiData.nutriments?.carbohydrates_100g || 0)).toFixed(1)),
      fat: Number((parseFloat(apiData.fat || apiData.nutriments?.fat_100g || 0)).toFixed(1)),
      serving_size: parseFloat(apiData.serving_size || apiData.portion_size || 100),
      serving_unit: (apiData.serving_unit || apiData.portion_unit || 'g').toLowerCase(),
      source: apiData.source || 'api',
      source_id: apiData.source_id || apiData.code || `api-${Date.now()}`
    };
  }

  /**
   * Calculate similarity score between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  static calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const normalize = (str) => str.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Check if one is a substring of the other
    if (s1.includes(s2) || s2.includes(s1)) {
      const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
      return 0.7 + (ratio * 0.3); // Scale between 0.7 and 1.0
    }

    // Calculate Levenshtein distance
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return maxLen > 0 ? 1 - distance / maxLen : 1;
  }

  /**
   * Check if two foods have similar nutritional values
   * @param {Object} food1 - First food
   * @param {Object} food2 - Second food
   * @returns {boolean} True if similar
   */
  static hasSimularNutrition(food1, food2) {
    // Compare nutritional values with tolerance
    const compareValues = (val1, val2) => {
      if (val1 === 0 && val2 === 0) return true;
      if (val1 === 0 || val2 === 0) return false;

      const ratio = Math.max(val1, val2) / Math.min(val1, val2);
      return ratio <= 1.2; // Allow 20% difference
    };

    // Normalize values to 100g for comparison
    const getNormalizedValue = (value, serving_size) => {
      if (!value || !serving_size || serving_size === 0) return 0;
      return (value / serving_size) * 100;
    };

    // Get normalized values
    const food1Normalized = {
      calories: getNormalizedValue(food1.calories, food1.serving_size),
      protein: getNormalizedValue(food1.protein, food1.serving_size),
      carbs: getNormalizedValue(food1.carbs, food1.serving_size),
      fat: getNormalizedValue(food1.fat, food1.serving_size)
    };

    const food2Normalized = {
      calories: getNormalizedValue(food2.calories, food2.serving_size),
      protein: getNormalizedValue(food2.protein, food2.serving_size),
      carbs: getNormalizedValue(food2.carbs, food2.serving_size),
      fat: getNormalizedValue(food2.fat, food2.serving_size)
    };

    // Compare each nutrient
    return compareValues(food1Normalized.calories, food2Normalized.calories) &&
      compareValues(food1Normalized.protein, food2Normalized.protein) &&
      compareValues(food1Normalized.carbs, food2Normalized.carbs) &&
      compareValues(food1Normalized.fat, food2Normalized.fat);
  }

  /**
   * Calculate relevance score for a food item based on search query
   * @param {Object} food - Food item
   * @param {string} query - Search query
   * @returns {number} Relevance score
   */
  static calculateRelevanceScore(food, query) {
    if (!food || !query) return 0;

    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
    const name = food.name.toLowerCase();
    const brand = (food.brand || '').toLowerCase();
    let score = 0;

    // Source quality score (base points)
    const sourceScores = { nutritionix: 20, usda: 20, spoonacular: 20 };
    score += sourceScores[food.source] || 0;

    // Name matching score
    for (const term of queryTerms) {
      // Exact word match in name
      if (name.split(/\s+/).includes(term)) {
        score += 50;
      }
      // Partial match in name
      else if (name.includes(term)) {
        score += 30;
      }

      // Brand match
      if (brand) {
        if (brand.split(/\s+/).includes(term)) {
          score += 20;
        }
        else if (brand.includes(term)) {
          score += 10;
        }
      }

      // Bonus for matches at start of name
      if (name.startsWith(term)) {
        score += 15;
      }
    }

    // Completeness score (having all nutritional values)
    // Give more weight to items with complete nutritional data
    const hasCalories = food.calories > 0;
    const hasProtein = food.protein > 0;
    const hasCarbs = food.carbs > 0;
    const hasFat = food.fat > 0;

    if (hasCalories) score += 10;
    if (hasProtein) score += 8;
    if (hasCarbs) score += 8;
    if (hasFat) score += 8;
    if (food.serving_size) score += 5;
    if (food.serving_unit) score += 5;

    // Bonus for having complete nutritional profile
    if (hasCalories && hasProtein && hasCarbs && hasFat) {
      score += 15;
    }

    return score;
  }

  /**
   * Remove exact duplicates and sort by relevance
   * @param {Array} foods - Array of food items
   * @param {string} query - Search query
   * @returns {Array} Deduplicated and sorted food items
   */
  static deduplicateResults(foods, query) {
    if (!Array.isArray(foods) || foods.length <= 1) return foods;

    // First, remove exact duplicates (same source and source_id)
    const seen = new Set();
    const uniqueFoods = foods.filter(food => {
      const key = `${food.source}:${food.source_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Calculate relevance scores and sort
    const scoredFoods = uniqueFoods.map(food => ({
      ...food,
      relevanceScore: this.calculateRelevanceScore(food, query)
    }));

    // Sort by relevance score (highest first)
    scoredFoods.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Remove the relevanceScore property before returning
    return scoredFoods.map(({ relevanceScore, ...food }) => food);
  }

  /**
   * Search for food items using external APIs in parallel
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of food items
   */
  static async searchFood(query) {
    try {
      logger.info(`Searching for food with query: ${query}`);

      // Check cache first
      const cacheKey = `search:${query}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for combined search: ${query}`);
        return cachedData;
      }

      // Run API searches in parallel
      const nutritionixPromise = nutritionixService.searchByName(query).catch(error => {
        logger.error('Nutritionix search error:', error.message);
        return [];
      });

      const usdaPromise = this.searchUSDAByName(query, true).catch(error => {
        logger.error('USDA search error:', error.message);
        return [];
      });

      const spoonacularPromise = spoonacularService.searchByName(query).catch(error => {
        logger.error('Spoonacular search error:', error.message);
        return [];
      });

      // Wait for all searches to complete
      const nutritionixResults = await nutritionixPromise;
      const usdaResults = await usdaPromise;
      const spoonacularResults = await spoonacularPromise;

      // Combine all results
      const allResults = [
        ...nutritionixResults,
        ...usdaResults,
        ...spoonacularResults
      ];

      // Log results from each source
      logger.info('Search results from each source:', {
        nutritionix: nutritionixResults.length,
        usda: usdaResults.length,
        spoonacular: spoonacularResults.length,
        total: allResults.length
      });

      // Remove exact duplicates and sort by relevance
      const processedResults = this.deduplicateResults(allResults, query);

      logger.info('Search results after processing:', {
        total: processedResults.length,
        removed: allResults.length - processedResults.length
      });

      // Cache the processed results
      setCacheData(cacheKey, processedResults);
      return processedResults;
    } catch (error) {
      logger.error(`Error in parallel food search: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch food data by barcode
   * @param {string} barcode - Barcode
   * @returns {Promise<Object|null>} Food data or null
   */
  static async fetchFoodByBarcode(barcode) {
    try {
      // Check cache first
      const cacheKey = `barcode:${barcode}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for barcode: ${barcode}`);
        return cachedData;
      }

      logger.info(`Fetching food data for barcode: ${barcode}`);

      // Try Nutritionix
      const nutritionixResult = await nutritionixService.searchByUPC(barcode);
      if (nutritionixResult) {
        logger.info('Food found in Nutritionix');

        // Ensure the barcode is included in the result
        const resultWithBarcode = {
          ...nutritionixResult,
          barcode: barcode
        };

        // Cache the result
        setCacheData(cacheKey, resultWithBarcode);
        return resultWithBarcode;
      }

      // Try Spoonacular if Nutritionix fails
      const spoonacularResult = await spoonacularService.searchByUPC(barcode);
      if (spoonacularResult) {
        logger.info('Food found in Spoonacular');

        // Ensure the barcode is included in the result
        const resultWithBarcode = {
          ...spoonacularResult,
          barcode: barcode
        };

        // Cache the result
        setCacheData(cacheKey, resultWithBarcode);
        return resultWithBarcode;
      }

      logger.info('No results found for barcode lookup');
      return null;
    } catch (error) {
      logger.error('Error fetching food by barcode:', error);
      return null;
    }
  }

  /**
   * Search food data from USDA FoodData Central API by name
   * @param {string} query - Search query
   * @returns {Promise<Object|Array>} Food data or array
   */
  static async searchUSDAByName(query, returnArray = false) {
    try {
      // Check cache first
      const cacheKey = `usda:${query}:${returnArray}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for USDA query: ${query}`);
        return cachedData;
      }

      // Check if USDA API key is available
      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        logger.warn('USDA API key not found');
        return returnArray ? [] : null;
      }

      logger.info(`Searching USDA for: ${query}`);

      try {
        // Make a direct axios request
        const response = await axios.get(`${USDA_API_URL}/foods/search`, {
          params: {
            query,
            pageSize: 25,
            pageNumber: 1,
            api_key: apiKey,
            dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded'
          },
          timeout: API_TIMEOUT
        });

        if (!response.data) {
          logger.info('USDA API returned empty data');
          return returnArray ? [] : null;
        }

        const data = response.data;

        if (data.foods && data.foods.length > 0) {
          logger.info(`Found ${data.foods.length} foods in USDA`);

          // Map foods to our format
          const transformedResults = data.foods.map(food => {
            // Extract nutrients
            const getNutrientValue = (nutrientId) => {
              if (!food.foodNutrients) return 0;
              const nutrient = food.foodNutrients.find(n => n.nutrientId === nutrientId);
              return nutrient ? nutrient.value : 0;
            };

            // Standardize nutrients to the serving size
            const standardizeNutrient = (value, servingSize = 100) => {
              return value * (servingSize / 100);
            };

            const servingSize = food.servingSize || 100;
            const calories = standardizeNutrient(getNutrientValue(1008), servingSize);
            const protein = standardizeNutrient(getNutrientValue(1003), servingSize);
            const carbs = standardizeNutrient(getNutrientValue(1005), servingSize);
            const fat = standardizeNutrient(getNutrientValue(1004), servingSize);

            return {
              name: food.description,
              brand: food.brandOwner || food.brandName || null,
              calories: Math.round(calories || 0),
              protein: Number((protein || 0).toFixed(1)),
              carbs: Number((carbs || 0).toFixed(1)),
              fat: Number((fat || 0).toFixed(1)),
              serving_size: servingSize,
              serving_unit: food.servingSizeUnit?.toLowerCase() || 'g',
              source: 'usda',
              source_id: food.fdcId.toString()
            };
          });

          // Filter out items without basic nutritional info
          const validResults = transformedResults.filter(item =>
            item.name && (item.calories > 0 || item.protein > 0 || item.carbs > 0 || item.fat > 0)
          );

          // Cache the transformed data
          setCacheData(cacheKey, validResults);
          return validResults;
        }

        logger.info(`No products found in USDA for query: ${query}`);
        return returnArray ? [] : null;
      } catch (error) {
        logger.error(`USDA API error: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`Error searching USDA: ${error.message}`);
      return returnArray ? [] : null;
    }
  }
}

module.exports = FoodApiService;
