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

      const response = await this.axiosInstance.get('/search/instant', {
        params: {
          query: query,
          detailed: true,
          branded: true,
          common: true,
          self: false
        }
      });

      if (!response.data?.common?.length && !response.data?.branded?.length) {
        console.log('❌ No results from Nutritionix');
        logger.info('No results found in Nutritionix for query:', query);
        return [];
      }

      // Combine common and branded foods
      const foods = [
        ...(response.data.common || []).map(food => ({
          ...food,
          food_name: food.food_name,
          serving_unit: food.serving_unit || 'g',
          serving_qty: food.serving_qty || 100,
          nf_calories: Math.round(food.full_nutrients?.find(n => n.attr_id === 208)?.value || 0),
          nf_protein: food.full_nutrients?.find(n => n.attr_id === 203)?.value || 0,
          nf_total_carbohydrate: food.full_nutrients?.find(n => n.attr_id === 205)?.value || 0,
          nf_total_fat: food.full_nutrients?.find(n => n.attr_id === 204)?.value || 0
        })),
        ...(response.data.branded || [])
      ];

      // Log the number of results
      console.log(`✅ Found ${foods.length} results from Nutritionix (${response.data.common?.length || 0} common, ${response.data.branded?.length || 0} branded)`);
      logger.info(`Found ${foods.length} results in Nutritionix for "${query}"`);

      // Transform and return the results
      const transformedResults = foods.map(food => this.transformFood(food));
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
      calories: Math.round(food.nf_calories || 0),
      protein: Number((food.nf_protein || 0).toFixed(1)),
      carbs: Number((food.nf_total_carbohydrate || 0).toFixed(1)),
      fat: Number((food.nf_total_fat || 0).toFixed(1)),
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