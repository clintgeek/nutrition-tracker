const axios = require('axios');
const logger = require('./logger');

const NUTRITIONIX_BASE_URL = 'https://trackapi.nutritionix.com/v2';

class NutritionixService {
  constructor() {
    // Log credentials (without showing full key)
    const appId = process.env.NUTRITIONIX_APP_ID;
    const apiKey = process.env.NUTRITIONIX_API_KEY;
    logger.info(`Initializing Nutritionix Service with APP_ID: ${appId ? appId.substring(0, 4) + '...' : 'missing'}`);
    logger.info(`API_KEY ${apiKey ? 'present' : 'missing'} (length: ${apiKey?.length || 0})`);

    this.axiosInstance = axios.create({
      baseURL: NUTRITIONIX_BASE_URL,
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID,
        'x-app-key': process.env.NUTRITIONIX_API_KEY,
        'x-remote-user-id': '0', // 0 for development/testing
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info('Nutritionix API successful response');
        return response;
      },
      (error) => {
        logger.error('Nutritionix API error:', {
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
      console.log('🔍 Querying Nutritionix API by UPC:', barcode);
      logger.info(`Searching Nutritionix by UPC: ${barcode}`);
      const response = await this.axiosInstance.get('/search/item', {
        params: { upc: barcode }
      });

      if (!response.data?.foods?.length) {
        logger.info('No results found in Nutritionix for UPC:', barcode);
        return null;
      }

      const food = response.data.foods[0];
      console.log('✅ Nutritionix UPC result:', { name: food.food_name, brand: food.brand_name });
      logger.info('Found food in Nutritionix:', { name: food.food_name, brand: food.brand_name });
      return this.transformFood(food);
    } catch (error) {
      console.log('❌ Nutritionix UPC error:', error.message);
      logger.error('Nutritionix UPC search error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchByName(query) {
    try {
      console.log('🔍 Querying Nutritionix API by name:', query);
      logger.info(`Searching Nutritionix by name: "${query}"`);

      const response = await this.axiosInstance.post('/natural/nutrients', {
        query: query,
        line_delimited: false,
        use_raw_foods: false,
        include_subrecipe: false,
        lat: 0,
        lng: 0,
        timezone: "US/Eastern"
      });

      if (!response.data?.foods?.length) {
        console.log('❌ No results from Nutritionix');
        logger.info('No results found in Nutritionix for query:', query);
        return [];
      }

      // Log the number of results
      console.log(`✅ Found ${response.data.foods.length} results from Nutritionix`);
      logger.info(`Found ${response.data.foods.length} results in Nutritionix for "${query}"`);

      // Transform and return the results
      const transformedResults = response.data.foods.map(food => this.transformFood(food));
      logger.info('Transformed Nutritionix results:', transformedResults.map(f => ({ name: f.name, brand: f.brand })));
      return transformedResults;
    } catch (error) {
      console.log('❌ Nutritionix search error:', error.message);
      logger.error('Nutritionix search error:', {
        message: error.message,
        response: error.response?.data,
        query: query
      });
      return [];
    }
  }

  transformFood(food) {
    const transformed = {
      name: food.food_name,
      brand: food.brand_name || null,
      calories: food.nf_calories || 0,
      protein: food.nf_protein || 0,
      carbs: food.nf_total_carbohydrate || 0,
      fat: food.nf_total_fat || 0,
      serving_size: food.serving_weight_grams || 100,
      serving_unit: 'g',
      source: 'nutritionix',
      source_id: food.nix_item_id || `nutritionix-${Date.now()}`,
      barcode: food.upc || null
    };

    logger.debug('Transformed Nutritionix food:', transformed);
    return transformed;
  }
}

module.exports = new NutritionixService();