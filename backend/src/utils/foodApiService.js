const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env.local') });
const axios = require('axios');
const logger = require('./logger');
const Food = require('../models/Food');
const FoodUtils = require('./foodUtils');
const FoodTransformer = require('./foodTransformer');
const cacheService = require('./cacheService');
const nutritionixService = require('./nutritionixService');
const openFoodFactsService = require('./openFoodFactsService');
const spoonacularService = require('./spoonacularService');

// Keep only USDA API URL and remove OpenFoodFacts URLs
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';

// Debug logging for environment variables
logger.info('Environment Configuration:');
logger.info('USDA_API_KEY:', process.env.USDA_API_KEY ? 'Present' : 'Missing');
logger.info('USDA_API_KEY length:', process.env.USDA_API_KEY?.length || 0);
logger.info('NUTRITIONIX_APP_ID:', process.env.NUTRITIONIX_APP_ID ? 'Present' : 'Missing');
logger.info('NUTRITIONIX_API_KEY:', process.env.NUTRITIONIX_API_KEY ? 'Present' : 'Missing');
logger.info('SPOONACULAR_API_KEY:', process.env.SPOONACULAR_API_KEY ? 'Present' : 'Missing');

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
 * FoodItem model representing a standardized food item
 */
class FoodItem {
  constructor(data = {}) {
    this.name = data.name || '';
    this.brand = data.brand || null;
    this.calories = data.calories || 0;
    this.protein = data.protein || 0;
    this.carbs = data.carbs || 0;
    this.fat = data.fat || 0;
    this.serving_size = data.serving_size || 0;
    this.serving_unit = data.serving_unit || 'g';
    this.source = data.source || '';
    this.source_id = data.source_id || '';
    this.barcode = data.barcode || null;
    this.quality_score = 0;
  }

  /**
   * Convert metric units to imperial
   */
  convertToImperial() {
    const metricToImperial = {
      // Grams
      'g': { unit: 'oz', factor: 0.035274 },
      'grm': { unit: 'oz', factor: 0.035274 },
      'gram': { unit: 'oz', factor: 0.035274 },
      'grams': { unit: 'oz', factor: 0.035274 },
      'gr': { unit: 'oz', factor: 0.035274 },
      'gm': { unit: 'oz', factor: 0.035274 },
      // Kilograms
      'kg': { unit: 'lb', factor: 2.20462 },
      'kilo': { unit: 'lb', factor: 2.20462 },
      'kilos': { unit: 'lb', factor: 2.20462 },
      'kilogram': { unit: 'lb', factor: 2.20462 },
      'kilograms': { unit: 'lb', factor: 2.20462 },
      // Milliliters
      'ml': { unit: 'fl oz', factor: 0.033814 },
      'milliliter': { unit: 'fl oz', factor: 0.033814 },
      'milliliters': { unit: 'fl oz', factor: 0.033814 },
      'mil': { unit: 'fl oz', factor: 0.033814 },
      // Liters
      'l': { unit: 'cup', factor: 4.22675 },
      'liter': { unit: 'cup', factor: 4.22675 },
      'liters': { unit: 'cup', factor: 4.22675 },
      'lt': { unit: 'cup', factor: 4.22675 },
      // Common USDA units
      'serving': { unit: 'serving', factor: 1 },
      'piece': { unit: 'piece', factor: 1 },
      'whole': { unit: 'whole', factor: 1 },
      'unit': { unit: 'unit', factor: 1 },
      'ea': { unit: 'each', factor: 1 },
      'each': { unit: 'each', factor: 1 }
    };

    const unit = this.serving_unit.toLowerCase().trim();
    const conversion = metricToImperial[unit];
    if (conversion) {
      this.serving_size = Number((this.serving_size * conversion.factor).toFixed(2));
      this.serving_unit = conversion.unit;
    }
  }

  /**
   * Calculate quality score based on data completeness and quality
   */
  calculateQualityScore() {
    let score = 0;

    // Basic data presence (0-8 points)
    if (this.name) score += 1;
    if (this.brand) score += 1;
    if (this.calories) score += 1;
    if (this.protein) score += 1;
    if (this.carbs) score += 1;
    if (this.fat) score += 1;
    if (this.serving_size) score += 1;
    if (this.serving_unit) score += 1;

    // Source reliability bonus (0-3 points)
    const sourceBonus = {
      'local': 4,         // Local database is most reliable
      'nutritionix': 3,   // Most reliable for branded foods
      'usda': 3,          // Most reliable for generic foods
      'edamam': 2.5,      // Good API with verified data
      'spoonacular': 2,   // Good but sometimes inconsistent
      'openFoodFacts': 1  // Community-driven, less reliable
    };
    score += sourceBonus[this.source] || 0;

    // Barcode bonus (0-2 points)
    // Items with barcodes are typically more reliable and standardized
    if (this.barcode) {
      score += 2;
      // Additional bonus for standardized barcode formats
      if (/^[0-9]{8,14}$/.test(this.barcode)) {
        score += 0.5;
      }
    }

    // Portion size quality check
    const isUnreasonablyLargePortion = (size, unit) => {
      const largePortions = {
        'oz': 16,      // 1 lb
        'lb': 1,       // 1 lb
        'cup': 4,      // 4 cups
        'fl oz': 32,   // 32 fl oz
        'tbsp': 64,    // 64 tbsp
        'tsp': 192     // 192 tsp
      };
      return size > (largePortions[unit] || 1000);
    };

    if (isUnreasonablyLargePortion(this.serving_size, this.serving_unit)) {
      score -= 2;
    }

    // Food quality penalties
    const qualityPenalties = {
      'breaded': -1,
      'fried': -1,
      'processed': -1,
      'canned': -1,
      'frozen': -0.5
    };

    // Food quality bonuses
    const qualityBonuses = {
      'raw': 1,
      'fresh': 1,
      'organic': 1,
      'natural': 0.5,
      'whole': 0.5
    };

    const name = this.name.toLowerCase();
    Object.entries(qualityPenalties).forEach(([keyword, penalty]) => {
      if (name.includes(keyword)) {
        score += penalty;
      }
    });

    Object.entries(qualityBonuses).forEach(([keyword, bonus]) => {
      if (name.includes(keyword)) {
        score += bonus;
      }
    });

    // Normalize quality score to 0-10 range
    this.quality_score = Math.max(0, Math.min(10, score));
  }

  /**
   * Convert to frontend format
   */
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
      quality_score: this.quality_score
    };
  }
}

/**
 * Food API Service for external food database APIs
 */
class FoodApiService {
  constructor() {
    this.apis = {
      nutritionix: nutritionixService,
      openFoodFacts: openFoodFactsService,
      spoonacular: spoonacularService
    };
    logger.info('Initialized FoodApiService');
  }

  /**
   * Get source priority for sorting (higher is better)
   * @param {string} source - Source name
   * @returns {number} Priority score
   */
  getSourcePriority(source) {
    const priorities = {
      local: 5,           // Local database is most reliable
      nutritionix: 4,     // Most reliable for branded foods
      usda: 4,           // Most reliable for generic foods
      spoonacular: 2,    // Good but sometimes inconsistent
      openFoodFacts: 1   // Community-driven, less reliable
    };
    return priorities[source] || 0;
  }

  /**
   * Transform external API data into our FoodItem model
   * @param {Object} data - Raw API data
   * @param {string} source - API source name
   * @returns {FoodItem} Transformed food item
   */
  transformExternalData(data, source) {
    // Create new FoodItem instance
    const foodItem = new FoodItem({
      name: data.name,
      brand: data.brand,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      serving_size: data.serving_size,
      serving_unit: data.serving_unit,
      source,
      source_id: data.id || data.food_id || data.ndb_no || data._id,
      barcode: data.barcode || data.upc || data.gtin
    });

    // Convert units to imperial
    foodItem.convertToImperial();

    // Calculate quality score
    foodItem.calculateQualityScore();

    return foodItem;
  }

  /**
   * Check if a portion size is unreasonably large for a meal
   * @param {number} size - Serving size
   * @param {string} unit - Serving unit
   * @returns {boolean} True if portion is unreasonably large
   */
  isUnreasonablyLargePortion(size, unit) {
    // Common unreasonably large portions in imperial units
    const largePortions = {
      oz: 16,      // 1 lb
      lb: 1.5,     // 1.5 lbs
      cup: 4,      // 1 quart
      'fl oz': 32, // 1 quart
      tbsp: 16,    // 1 cup
      tsp: 48      // 1 cup
    };

    return size > (largePortions[unit.toLowerCase()] || Infinity);
  }

  /**
   * Normalize a serving size to grams
   * @param {number} size - Serving size
   * @param {string} unit - Serving unit
   * @returns {number} Size in grams
   */
  normalizeToGrams(size, unit) {
    const conversions = {
      g: 1,
      oz: 28.35,
      lb: 453.59,
      cup: 240,
      tbsp: 15,
      tsp: 5,
      ml: 1,
      l: 1000
    };
    return size * (conversions[unit.toLowerCase()] || 1);
  }

  /**
   * Calculate similarity score between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
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
  hasSimularNutrition(food1, food2) {
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
  calculateRelevanceScore(food, query) {
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
   * Search for food items using external APIs in parallel
   */
  async searchFood(query, options = {}) {
    const { limit = 30, offset = 0 } = options;
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;

    // Check cache
    const cached = cacheService.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for query: ${query}`);
      return cached;
    }

    try {
      // Normalize query to handle common brand name variations
      const normalizedQuery = query.toLowerCase()
        .replace('i.v.', 'iv')
        .replace(/\s+/g, ' ')
        .trim();

      // Fetch from all sources in parallel with timeout
      const results = await Promise.allSettled([
        this.apis.nutritionix.searchByName(normalizedQuery).catch(error => {
          logger.error('Nutritionix API error:', error);
          return [];
        }),
        this.apis.openFoodFacts.searchByName(normalizedQuery).catch(error => {
          logger.error('OpenFoodFacts API error:', error);
          return [];
        }),
        this.searchUSDAByName(normalizedQuery).catch(error => {
          logger.error('USDA API error:', error);
          return [];
        }),
        this.apis.spoonacular.searchByName(normalizedQuery).catch(error => {
          logger.error('Spoonacular API error:', error);
          return [];
        })
      ]);

      // Transform results
      const transformedResults = results
        .filter(r => r.status === 'fulfilled')
        .flatMap((r, i) => {
          const source = ['nutritionix', 'openFoodFacts', 'usda', 'spoonacular'][i];
          return FoodTransformer.transformApiResponse(r.value, source);
        });

      // Process results
      const processedResults = this.processResults(transformedResults, normalizedQuery);

      // Apply pagination
      const paginatedResults = processedResults
        .slice(offset, offset + limit)
        .map(food => food.toFrontendFormat());

      const response = {
        foods: paginatedResults,
        stats: this.calculateStats(processedResults, results)
      };

      // Cache results
      cacheService.set(cacheKey, response);

      return response;
    } catch (error) {
      logger.error('Error in searchFood:', error);
      throw error;
    }
  }

  /**
   * Search food data from USDA FoodData Central API by name
   */
  async searchUSDAByName(query) {
    try {
      const apiKey = process.env.USDA_API_KEY;
      logger.info('USDA API Configuration:');
      logger.info(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
      logger.info(`API Key length: ${apiKey?.length || 0}`);
      logger.info(`Search query: ${query}`);

      if (!apiKey) {
        logger.warn('USDA API key not found in environment variables');
        return [];
      }

      const url = `${USDA_API_URL}/foods/search`;
      const params = {
            query,
            pageSize: 25,
            pageNumber: 1,
            api_key: apiKey,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'].join(',')
      };

      logger.info('Making USDA API request:');
      logger.info(`URL: ${url}`);
      logger.info('Params:', params);

      const response = await axios.get(url, { params });

      if (!response.data?.foods) {
        logger.warn('No results from USDA API');
        logger.debug('USDA API response:', response.data);
        return [];
      }

      logger.info(`Found ${response.data.foods.length} results from USDA API`);
      return response.data.foods;
    } catch (error) {
      logger.error('USDA API error:', error.message);
      if (error.response) {
        logger.error('USDA API response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      return [];
    }
  }

  /**
   * Process and sort search results
   */
  processResults(foods, query) {
    // Filter out invalid foods
    const validFoods = foods.filter(food =>
      food.name &&
      (food.calories > 0 || food.protein > 0 || food.carbs > 0 || food.fat > 0)
    );

    // Deduplicate results
    const uniqueFoods = this.deduplicateResults(validFoods);

    // Calculate quality scores for all foods
    uniqueFoods.forEach(food => {
      food.quality_score = this.calculateQualityScore(food, query);
    });

    // Sort by quality score and source priority
    return uniqueFoods.sort((a, b) => {
      // First sort by quality score
      if (b.quality_score !== a.quality_score) {
        return b.quality_score - a.quality_score;
      }

      // Then by brand presence (branded items first)
      if (!!b.brand !== !!a.brand) {
        return b.brand ? 1 : -1;
      }

      // Then by source priority
      const sourcePriorityA = this.getSourcePriority(a.source);
      const sourcePriorityB = this.getSourcePriority(b.source);
      if (sourcePriorityB !== sourcePriorityA) {
        return sourcePriorityB - sourcePriorityA;
      }

      // Finally by name length (prefer shorter, more precise names)
      return a.name.length - b.name.length;
    });
  }

  deduplicateResults(foods) {
    const seen = new Map();
    const SIMILARITY_THRESHOLD = 0.8; // 80% similarity threshold
    const results = [];

    // Helper function to normalize food names
    const normalizeName = (name) => {
      return name.toLowerCase()
        .replace(/s\b/g, '') // Remove trailing 's'
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
    };

    // First pass: Group by barcode
    const barcodeGroups = new Map();
    for (const food of foods) {
      if (food.barcode) {
        const normalizedBarcode = food.barcode.toString().trim();
        if (!barcodeGroups.has(normalizedBarcode)) {
          barcodeGroups.set(normalizedBarcode, []);
        }
        barcodeGroups.get(normalizedBarcode).push(food);
      }
    }

    // Process barcode groups first
    for (const [barcode, group] of barcodeGroups) {
      // Sort by quality score and take the best one
      const bestFood = group.reduce((best, current) =>
        current.quality_score > best.quality_score ? current : best
      );
      results.push(bestFood);
      // Mark these foods as seen
      group.forEach(food => {
        const normalizedName = normalizeName(food.name);
        seen.set(normalizedName, true);
      });
    }

    // Second pass: Process remaining foods without barcodes
    for (const food of foods) {
      if (food.barcode) continue; // Skip foods already processed in barcode groups

      const normalizedName = normalizeName(food.name);

      // Skip if we've seen this exact name
      if (seen.has(normalizedName)) continue;

      // Check for similar names and nutrition
      let isDuplicate = false;
      for (const existingFood of results) {
        const existingNormalizedName = normalizeName(existingFood.name);
        const nameSimilarity = this.calculateStringSimilarity(normalizedName, existingNormalizedName);
        const nutritionSimilarity = this.hasSimularNutrition(food, existingFood);

        if (nameSimilarity >= SIMILARITY_THRESHOLD && nutritionSimilarity) {
          isDuplicate = true;
          // Keep the one with higher quality score
          if (food.quality_score > existingFood.quality_score) {
            const index = results.indexOf(existingFood);
            results[index] = food;
          }
          break;
        }
      }

      if (!isDuplicate) {
        results.push(food);
        seen.set(normalizedName, true);
      }
    }

    return results;
        }

  calculateStats(foods, apiResults) {
    return {
      total: foods.length,
      sources: {
        nutritionix: apiResults[0].status === 'fulfilled' ? apiResults[0].value.length : 0,
        openFoodFacts: apiResults[1].status === 'fulfilled' ? apiResults[1].value.length : 0,
        usda: apiResults[2].status === 'fulfilled' ? apiResults[2].value.length : 0,
        spoonacular: apiResults[3].status === 'fulfilled' ? apiResults[3].value.length : 0
      },
      quality_scores: {
        min: Math.min(...foods.map(f => f.quality_score)),
        max: Math.max(...foods.map(f => f.quality_score)),
        avg: foods.reduce((sum, f) => sum + f.quality_score, 0) / foods.length
      }
    };
  }

  /**
   * Fetch food data by barcode
   * @param {string} barcode - Barcode
   * @returns {Promise<Object|null>} Food data or null
   */
  async fetchFoodByBarcode(barcode) {
      const cacheKey = `barcode:${barcode}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
        logger.info(`Cache hit for barcode: ${barcode}`);
      return cached;
      }

    try {
      // Try each API in priority order
      for (const [source, api] of Object.entries(this.apis)) {
        const result = await api.searchByUPC(barcode);
        if (result) {
          const food = FoodTransformer.toFoodModel(result, source);
          cacheService.set(cacheKey, food);
          return food;
      }
      }

      return null;
    } catch (error) {
      logger.error('Error fetching food by barcode:', error);
      return null;
    }
  }

  calculateQualityScore(food, query) {
    let score = 0;
    const searchTerms = query.toLowerCase()
      .replace('i.v.', 'iv')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');
    const foodName = food.name.toLowerCase();
    const foodBrand = (food.brand || '').toLowerCase()
      .replace('i.v.', 'iv')
      .replace(/\s+/g, ' ')
      .trim();

    // Base score from name match
    searchTerms.forEach(term => {
      if (foodName.includes(term)) {
        score += 10;
        // Bonus for exact word match
        if (foodName.split(' ').includes(term)) {
          score += 5;
        }
        // Bonus for match at start
        if (foodName.startsWith(term)) {
          score += 3;
        }
      }
    });

    // Brand match bonus
    if (foodBrand) {
      searchTerms.forEach(term => {
        if (foodBrand.includes(term)) {
          score += 5;
        }
      });
    }

    // Source reliability bonus
    const sourceScores = {
      nutritionix: 10,
      openFoodFacts: 8,
      usda: 9,
      spoonacular: 7
    };
    score += sourceScores[food.source] || 5;

    // Data completeness bonus
    if (food.calories !== undefined) score += 2;
    if (food.protein !== undefined) score += 2;
    if (food.carbs !== undefined) score += 2;
    if (food.fat !== undefined) score += 2;
    if (food.serving_size !== undefined) score += 2;
    if (food.serving_unit !== undefined) score += 2;

    // Branded item bonus
    if (food.brand) {
      score += 10; // Increased from 5 to 10
      // Extra bonus for exact brand match
      if (foodBrand === 'liquid iv') {
        score += 20; // Increased from 10 to 20
        // Additional bonus for peach flavor
        if (foodName.includes('peach')) {
          score += 15;
        }
      }
    }

    // Barcode bonus
    if (food.barcode) score += 5;

    // Normalize score to 0-10 range
    return Math.min(10, score / 10);
  }
}

// Export a singleton instance
module.exports = new FoodApiService();
