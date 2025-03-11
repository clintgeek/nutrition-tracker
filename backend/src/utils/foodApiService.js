const axios = require('axios');
const logger = require('./logger');
const nutritionixService = require('./nutritionixService');

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v0';
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

const API_TIMEOUT = 3000; // Reduced to 3 seconds
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await axios.get(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
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
      calories: parseFloat(apiData.calories || apiData.energy_kcal || apiData.nutriments?.energy_kcal || 0),
      protein: parseFloat(apiData.protein || apiData.proteins || apiData.nutriments?.proteins_100g || 0),
      carbs: parseFloat(apiData.carbohydrates || apiData.nutriments?.carbohydrates_100g || 0),
      fat: parseFloat(apiData.fat || apiData.nutriments?.fat_100g || 0),
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
   * @returns {number} Similarity score between 0 and 1
   */
  static calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    // Normalize strings: lowercase, remove extra spaces, remove special characters
    const normalize = (str) => str.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    // Check for exact match after normalization
    if (s1 === s2) return 1;

    // Check if one string contains the other
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Calculate Levenshtein distance
    const m = s1.length;
    const n = s2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    // Convert distance to similarity score (0 to 1)
    const maxLength = Math.max(m, n);
    return maxLength === 0 ? 1 : 1 - (dp[m][n] / maxLength);
  }

  /**
   * Check if two foods have similar nutritional values
   * @param {Object} food1 - First food item
   * @param {Object} food2 - Second food item
   * @returns {boolean} True if nutritional values are similar
   */
  static hasSimularNutrition(food1, food2) {
    const tolerance = 0.1; // 10% tolerance

    const compareValues = (val1, val2) => {
      if (val1 === 0 && val2 === 0) return true;
      if (val1 === 0 || val2 === 0) return false;

      const diff = Math.abs(val1 - val2);
      const avg = (val1 + val2) / 2;
      return (diff / avg) <= tolerance;
    };

    // Convert to per 100g if serving sizes are different
    const getNormalizedValue = (value, serving_size) => {
      return (value * 100) / serving_size;
    };

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

    return compareValues(food1Normalized.calories, food2Normalized.calories) &&
           compareValues(food1Normalized.protein, food2Normalized.protein) &&
           compareValues(food1Normalized.carbs, food2Normalized.carbs) &&
           compareValues(food1Normalized.fat, food2Normalized.fat);
  }

  /**
   * Remove duplicate food items from search results
   * @param {Array} foods - Array of food items
   * @returns {Array} Deduplicated food items
   */
  static deduplicateResults(foods) {
    if (!Array.isArray(foods) || foods.length <= 1) return foods;

    const result = [];
    const seen = new Set();

    // Sort by source priority (nutritionix > usda > openfoodfacts)
    const sourcePriority = { nutritionix: 3, usda: 2, openfoodfacts: 1 };
    const sortedFoods = [...foods].sort((a, b) =>
      sourcePriority[b.source] - sourcePriority[a.source]
    );

    for (const food of sortedFoods) {
      // Skip if we've already seen this exact food
      const foodKey = `${food.source}:${food.source_id}`;
      if (seen.has(foodKey)) continue;
      seen.add(foodKey);

      // Check if we already have a similar food
      const isDuplicate = result.some(existingFood => {
        const nameSimilarity = this.calculateStringSimilarity(food.name, existingFood.name);
        if (nameSimilarity < 0.8) return false;

        // If names are similar, check nutritional values
        return this.hasSimularNutrition(food, existingFood);
      });

      if (!isDuplicate) {
        result.push(food);
      } else {
        logger.debug('Duplicate food found and skipped:', {
          name: food.name,
          source: food.source
        });
      }
    }

    logger.info(`Deduplication complete: ${foods.length} items reduced to ${result.length}`);
    return result;
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

      // Run all API searches in parallel
      const searches = [
        nutritionixService.searchByName(query).catch(error => {
          logger.error('Nutritionix search error:', error.message);
          return [];
        }),
        this.searchOpenFoodFacts(query).catch(error => {
          logger.error('OpenFoodFacts search error:', error.message);
          return [];
        }),
        this.searchUSDAByName(query, true).catch(error => {
          logger.error('USDA search error:', error.message);
          return [];
        })
      ];

      // Wait for all searches to complete
      const [nutritionixResults, openFoodResults, usdaResults] = await Promise.all(searches);

      // Combine all results
      const allResults = [
        ...nutritionixResults,
        ...(Array.isArray(openFoodResults) ? openFoodResults : [openFoodResults].filter(Boolean)),
        ...(Array.isArray(usdaResults) ? usdaResults : [usdaResults].filter(Boolean))
      ];

      // Log results from each source before deduplication
      logger.info('Search results before deduplication:', {
        nutritionix: nutritionixResults.length,
        openFoodFacts: Array.isArray(openFoodResults) ? openFoodResults.length : (openFoodResults ? 1 : 0),
        usda: Array.isArray(usdaResults) ? usdaResults.length : (usdaResults ? 1 : 0),
        total: allResults.length
      });

      // Deduplicate results
      const dedupedResults = this.deduplicateResults(allResults);

      // Log results after deduplication
      logger.info('Search results after deduplication:', {
        total: dedupedResults.length,
        removed: allResults.length - dedupedResults.length
      });

      // Cache the deduplicated results
      setCacheData(cacheKey, dedupedResults);
      return dedupedResults;
    } catch (error) {
      logger.error(`Error in parallel food search: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch food data from OpenFoodFacts API by barcode
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

      // Try Nutritionix first
      const nutritionixResult = await nutritionixService.searchByUPC(barcode);
      if (nutritionixResult) {
        logger.info('Food found in Nutritionix:', nutritionixResult);
        return nutritionixResult;
      }

      // Fallback to OpenFoodFacts
      logger.info('Food not found in Nutritionix, trying OpenFoodFacts...');
      const openFoodFactsResult = await this.fetchFromOpenFoodFacts(barcode);
      if (openFoodFactsResult) {
        return openFoodFactsResult;
      }

      return null;
    } catch (error) {
      logger.error('Error fetching food by barcode:', error);
      return null;
    }
  }

  /**
   * Search food data from OpenFoodFacts API by name
   * @param {string} query - Search query
   * @returns {Promise<Array>} Food data array
   */
  static async searchOpenFoodFacts(query) {
    try {
      // Check cache first
      const cacheKey = `off:${query}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        logger.info(`Cache hit for OpenFoodFacts query: ${query}`);
        return cachedData;
      }

      console.log('🔍 Querying OpenFoodFacts API:', query);
      logger.info(`Searching OpenFoodFacts for: ${query}`);

      // Call OpenFoodFacts API with timeout
      const response = await fetchWithTimeout(
        `${OPENFOODFACTS_API_URL}/product/${query}.json`
      );
      const data = await response.data;

      if (data.status === 1 && data.product) {
        const transformedData = this.transformExternalData({
          ...data.product,
          barcode: data.product.code,
          source: 'openfoodfacts'
        });

        console.log('✅ OpenFoodFacts result:', {
          name: transformedData.name,
          brand: transformedData.brand || 'no brand'
        });

        // Cache the transformed data
        setCacheData(cacheKey, transformedData);
        return transformedData;
      }

      console.log('❌ No results from OpenFoodFacts');
      logger.info(`Product not found in OpenFoodFacts for query: ${query}`);
      return [];
    } catch (error) {
      console.log('❌ OpenFoodFacts error:', error.message);
      logger.error(`Error searching OpenFoodFacts: ${error.message}`);
      return [];
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
        console.log('❌ USDA API key not found');
        logger.warn('USDA API key not found');
        return returnArray ? [] : null;
      }

      console.log('🔍 Querying USDA API:', query);
      logger.info(`Searching USDA for: ${query}`);

      // Call USDA API with timeout
      const response = await fetchWithTimeout(
        `${USDA_API_URL}/foods/search`,
        {
          params: {
            query,
            pageSize: 10,
            pageNumber: 1,
            api_key: apiKey,
            dataType: ['Survey (FNDDS)', 'SR Legacy']
          }
        }
      );
      const data = await response.data;

      if (data.foods && data.foods.length > 0) {
        console.log(`✅ Found ${data.foods.length} results from USDA`);
        logger.info(`Found ${data.foods.length} foods in USDA`);

        // Map foods to our format
        const mappedFoods = data.foods.map(food => {
          // Extract nutrients
          const getNutrientValue = (nutrientId) => {
            const nutrient = food.foodNutrients.find(n => n.nutrientId === nutrientId);
            return nutrient ? nutrient.value : 0;
          };

          return {
            name: food.description,
            brand: food.brandOwner || null,
            calories: getNutrientValue(1008) || 0, // Energy (kcal)
            protein: getNutrientValue(1003) || 0, // Protein
            carbs: getNutrientValue(1005) || 0, // Carbohydrates
            fat: getNutrientValue(1004) || 0, // Total lipid (fat)
            serving_size: food.servingSize || '100',
            serving_unit: food.servingSizeUnit || 'g',
            barcode: null, // USDA doesn't provide barcodes
            source: 'usda',
            source_id: food.fdcId.toString()
          };
        });

        // Cache the results
        const result = returnArray ? mappedFoods : mappedFoods[0];
        setCacheData(cacheKey, result);
        return result;
      }

      console.log('❌ No results from USDA');
      logger.info(`No foods found in USDA for query: ${query}`);
      return returnArray ? [] : null;
    } catch (error) {
      console.log('❌ USDA search error:', error.message);
      logger.error(`Error searching USDA: ${error.message}`);
      return returnArray ? [] : null;
    }
  }

  /**
   * Fetch food data from OpenFoodFacts API by barcode
   * @param {string} barcode - Barcode
   * @returns {Promise<Object|null>} Food data or null
   */
  static async fetchFromOpenFoodFacts(barcode) {
    try {
      const response = await fetchWithTimeout(
        `${OPENFOODFACTS_API_URL}/product/${barcode}.json`
      );

      if (response.data.status !== 1) {
        return null;
      }

      const transformedData = this.transformExternalData({
        ...response.data.product,
        barcode,
        source: 'openfoodfacts'
      });

      // Cache the transformed data
      setCacheData(`barcode:${barcode}`, transformedData);
      return transformedData;
    } catch (error) {
      logger.error('OpenFoodFacts API error:', error);
      return null;
    }
  }
}

module.exports = FoodApiService;