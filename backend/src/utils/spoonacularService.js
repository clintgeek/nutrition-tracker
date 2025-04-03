const axios = require('axios');
const logger = require('./logger');

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

class SpoonacularService {
  constructor() {
    // Log credentials (without showing full key)
    const apiKey = process.env.SPOONACULAR_API_KEY;
    logger.info(`Initializing Spoonacular Service with API_KEY: ${apiKey ? apiKey.substring(0, 4) + '...' : 'missing'}`);

    // Store API key to use in query parameters
    this.apiKey = apiKey;

    this.axiosInstance = axios.create({
      baseURL: SPOONACULAR_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info('Spoonacular API successful response');
        return response;
      },
      (error) => {
        logger.error('Spoonacular API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        throw error;
      }
    );
  }

  async searchByUPC(barcode) {
    try {
      console.log('🔍 Querying Spoonacular API by UPC:', barcode);
      logger.info(`Searching Spoonacular by UPC: ${barcode}`);

      // Using apiKey as query parameter as specified in Spoonacular docs
      const response = await this.axiosInstance.get(`/food/products/upc/${barcode}`, {
        params: {
          apiKey: this.apiKey
        }
      });

      if (!response.data) {
        logger.info('No results found in Spoonacular for UPC:', barcode);
        return null;
      }

      const food = response.data;
      console.log('✅ Spoonacular UPC result:', { name: food.title, id: food.id });
      logger.info('Found food in Spoonacular:', { name: food.title, id: food.id });
      return this.transformFood(food);
    } catch (error) {
      console.log('❌ Spoonacular UPC error:', error.message);
      logger.error('Spoonacular UPC search error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchByName(query) {
    try {
      console.log('🔍 Querying Spoonacular API by name:', query);
      logger.info(`Searching Spoonacular by name: "${query}"`);

      // Log the full URL for debugging
      const url = `/food/products/search`;
      const params = {
        query: query,
        number: 25,
        apiKey: this.apiKey
      };

      console.log(`Debug - Full Spoonacular URL: ${SPOONACULAR_BASE_URL}${url}?apiKey=${this.apiKey}&query=${encodeURIComponent(query)}&number=25`);
      logger.info('Debug - API key used:', this.apiKey);

      // Include apiKey in query parameters
      const response = await this.axiosInstance.get(url, { params });

      if (!response.data?.products?.length) {
        console.log('❌ No results from Spoonacular');
        logger.info('No results found in Spoonacular for query:', query);
        return [];
      }

      // Get the food items
      const foods = response.data.products;

      // We need to get nutrition data for each product
      const detailedResults = [];

      // For efficiency, only get detailed info for first 5 results
      const limitedFoods = foods.slice(0, 5);

      for (const food of limitedFoods) {
        try {
          // Include apiKey in query parameters
          const detailedData = await this.axiosInstance.get(`/food/products/${food.id}`, {
            params: {
              apiKey: this.apiKey
            }
          });

          if (detailedData.data) {
            detailedResults.push(detailedData.data);
          }
        } catch (detailError) {
          logger.error(`Error fetching details for product ${food.id}:`, detailError.message);
          // Still include basic data even if detailed fetch fails
          detailedResults.push(food);
        }
      }

      // Log the number of results
      console.log(`✅ Found ${foods.length} results from Spoonacular (fetched details for ${detailedResults.length})`);
      logger.info(`Found ${foods.length} results in Spoonacular for "${query}"`);

      // Transform and return the results
      const transformedResults = detailedResults.map(food => this.transformFood(food));
      logger.info('Transformed Spoonacular results:', transformedResults.map(f => ({ name: f.name })));
      return transformedResults;
    } catch (error) {
      console.log('❌ Spoonacular search error:', error.message);
      logger.error('Spoonacular search error:', {
        message: error.message,
        response: error.response?.data,
        query: query
      });
      return [];
    }
  }

  transformFood(food) {
    // Extract nutrients from different possible formats
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    // Handle different API response formats
    if (food.nutrition) {
      if (food.nutrition.nutrients) {
        // Find the nutrients by name
        const findNutrient = (name) => {
          const nutrient = food.nutrition.nutrients.find(n => n.name.toLowerCase() === name.toLowerCase());
          return nutrient ? nutrient.amount : 0;
        };

        calories = findNutrient('calories');
        protein = findNutrient('protein');
        carbs = findNutrient('carbohydrates');
        fat = findNutrient('fat');
      } else if (food.nutrition.caloricBreakdown) {
        // Use caloric breakdown if available
        const cals = food.nutrition.calories || 0;
        const breakdown = food.nutrition.caloricBreakdown;

        calories = cals;
        protein = (breakdown.percentProtein / 100) * cals / 4; // 4 calories per gram of protein
        carbs = (breakdown.percentCarbs / 100) * cals / 4; // 4 calories per gram of carbs
        fat = (breakdown.percentFat / 100) * cals / 9; // 9 calories per gram of fat
      }
    }

    const transformed = {
      name: food.title || food.name || '',
      brand: food.brand || null,
      calories: Math.round(calories || 0),
      protein: Number((protein || 0).toFixed(1)),
      carbs: Number((carbs || 0).toFixed(1)),
      fat: Number((fat || 0).toFixed(1)),
      serving_size: food.serving_size || 100,
      serving_unit: 'g',
      source: 'spoonacular',
      source_id: food.id?.toString() || `spoonacular-${Date.now()}`,
      barcode: food.upc || null
    };

    logger.debug('Transformed Spoonacular food:', transformed);
    return transformed;
  }
}

module.exports = new SpoonacularService();