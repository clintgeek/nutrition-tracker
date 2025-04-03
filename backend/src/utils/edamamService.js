const axios = require('axios');
const logger = require('./logger');

const EDAMAM_BASE_URL = 'https://api.edamam.com';
const FOOD_DATABASE_ENDPOINT = '/api/food-database/v2/parser';

class EdamamService {
  constructor() {
    // Log credentials (without showing full key)
    const appId = process.env.EDAMAM_APP_ID;
    const apiKey = process.env.EDAMAM_API_KEY;
    logger.info(`Initializing Edamam Service with APP_ID: ${appId ? appId.substring(0, 4) + '...' : 'missing'}`);
    logger.info(`API_KEY ${apiKey ? 'present' : 'missing'} (length: ${apiKey?.length || 0})`);

    this.axiosInstance = axios.create({
      baseURL: EDAMAM_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info('Edamam API successful response');
        return response;
      },
      (error) => {
        logger.error('Edamam API error:', {
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
      console.log('🔍 Querying Edamam API by UPC:', barcode);
      logger.info(`Searching Edamam by UPC: ${barcode}`);

      const response = await this.axiosInstance.get(FOOD_DATABASE_ENDPOINT, {
        params: {
          app_id: process.env.EDAMAM_APP_ID,
          app_key: process.env.EDAMAM_API_KEY,
          upc: barcode
        }
      });

      if (!response.data?.hints?.length) {
        logger.info('No results found in Edamam for UPC:', barcode);
        return null;
      }

      const food = response.data.hints[0].food;
      console.log('✅ Edamam UPC result:', { name: food.label, brand: food.brand });
      logger.info('Found food in Edamam:', { name: food.label, brand: food.brand });
      return this.transformFood(food);
    } catch (error) {
      console.log('❌ Edamam UPC error:', error.message);
      logger.error('Edamam UPC search error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchByName(query) {
    try {
      console.log('🔍 Querying Edamam API by name:', query);
      logger.info(`Searching Edamam by name: "${query}"`);

      const response = await this.axiosInstance.get(FOOD_DATABASE_ENDPOINT, {
        params: {
          app_id: process.env.EDAMAM_APP_ID,
          app_key: process.env.EDAMAM_API_KEY,
          ingr: query
        }
      });

      if (!response.data?.hints?.length) {
        console.log('❌ No results from Edamam');
        logger.info('No results found in Edamam for query:', query);
        return [];
      }

      // Get food items from hints
      const foods = response.data.hints.map(hint => hint.food);

      // Log the number of results
      console.log(`✅ Found ${foods.length} results from Edamam`);
      logger.info(`Found ${foods.length} results in Edamam for "${query}"`);

      // Transform and return the results
      const transformedResults = foods.map(food => this.transformFood(food));
      logger.info('Transformed Edamam results:', transformedResults.map(f => ({ name: f.name, brand: f.brand })));
      return transformedResults;
    } catch (error) {
      console.log('❌ Edamam search error:', error.message);
      logger.error('Edamam search error:', {
        message: error.message,
        response: error.response?.data,
        query: query
      });
      return [];
    }
  }

  transformFood(food) {
    // Extract nutrients
    const nutrients = food.nutrients || {};

    const transformed = {
      name: food.label,
      brand: food.brand || null,
      calories: Math.round(nutrients.ENERC_KCAL || 0),
      protein: Number((nutrients.PROCNT || 0).toFixed(1)),
      carbs: Number((nutrients.CHOCDF || 0).toFixed(1)),
      fat: Number((nutrients.FAT || 0).toFixed(1)),
      serving_size: 100, // Default to 100g as Edamam typically provides nutrients per 100g
      serving_unit: 'g',
      source: 'edamam',
      source_id: food.foodId || `edamam-${Date.now()}`,
      barcode: food.upc || null
    };

    logger.debug('Transformed Edamam food:', transformed);
    return transformed;
  }
}

module.exports = new EdamamService();