const axios = require('axios');
const logger = require('./logger');

// Use the base URL that worked in our tests
const OPENFOODFACTS_BASE_URL = 'https://world.openfoodfacts.org';

class OpenFoodFactsService {
  constructor() {
    logger.info('Initializing OpenFoodFacts Service');
    logger.info(`Using OpenFoodFacts base URL: ${OPENFOODFACTS_BASE_URL}`);

    this.axiosInstance = axios.create({
      baseURL: OPENFOODFACTS_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NutritionTrackerApp/1.0 (contact@nutritiontracker.com)'
      }
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.info('OpenFoodFacts API successful response');
        return response;
      },
      (error) => {
        logger.error('OpenFoodFacts API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          url: error.config?.url,
          params: error.config?.params
        });
        throw error;
      }
    );
  }

  async searchByUPC(barcode) {
    try {
      console.log('🔍 Querying OpenFoodFacts API by UPC:', barcode);
      logger.info(`Searching OpenFoodFacts by UPC: ${barcode}`);

      // Use the working endpoint structure for barcode lookup
      const response = await this.axiosInstance.get('/cgi/search.pl', {
        params: {
          code: barcode,
          search_simple: 1,
          action: 'process',
          json: 1,
          fields: 'code,product_name,brands,nutriments,serving_size,serving_quantity,nutrient_levels'
        }
      });

      if (!response.data?.products?.length) {
        logger.info('No results found in OpenFoodFacts for UPC:', barcode);
        return null;
      }

      const product = response.data.products[0];
      console.log('✅ OpenFoodFacts UPC result:', { name: product.product_name, code: product.code });
      logger.info('Found product in OpenFoodFacts:', { name: product.product_name, code: product.code });
      return this.transformFood(product);
    } catch (error) {
      console.log('❌ OpenFoodFacts UPC error:', error.message);
      logger.error('OpenFoodFacts UPC search error:', error.response?.data || error.message);
      return null;
    }
  }

  async searchByName(query) {
    try {
      console.log('🔍 Querying OpenFoodFacts API by name:', query);
      logger.info(`Searching OpenFoodFacts by name: "${query}"`);

      // Use the working endpoint structure for name search
      const response = await this.axiosInstance.get('/cgi/search.pl', {
        params: {
          search_terms: query,
          search_simple: 1,
          action: 'process',
          json: 1,
          fields: 'code,product_name,brands,nutriments,serving_size,serving_quantity,nutrient_levels',
          page_size: 25
        }
      });

      if (!response.data?.products?.length) {
        console.log('❌ No results from OpenFoodFacts');
        logger.info('No results found in OpenFoodFacts for query:', query);
        return [];
      }

      // Get the products
      const products = response.data.products;

      // Log the number of results
      console.log(`✅ Found ${products.length} results from OpenFoodFacts`);
      logger.info(`Found ${products.length} results in OpenFoodFacts for "${query}"`);

      // Transform and return the results
      const transformedResults = products.map(product => this.transformFood(product));
      logger.info('Transformed OpenFoodFacts results:', transformedResults.map(f => ({ name: f.name, brand: f.brand })));
      return transformedResults;
    } catch (error) {
      console.log('❌ OpenFoodFacts search error:', error.message);
      logger.error('OpenFoodFacts search error:', {
        message: error.message,
        response: error.response?.data,
        query: query,
        url: error.config?.url,
        params: error.config?.params
      });
      return [];
    }
  }

  transformFood(product) {
    // Extract nutrients from API response
    const nutriments = product.nutriments || {};

    const transformed = {
      name: product.product_name || '',
      brand: product.brands || null,
      calories: Math.round(nutriments.energy_kcal_100g || nutriments['energy-kcal_100g'] || 0),
      protein: Number((nutriments.proteins_100g || 0).toFixed(1)),
      carbs: Number((nutriments.carbohydrates_100g || 0).toFixed(1)),
      fat: Number((nutriments.fat_100g || 0).toFixed(1)),
      serving_size: product.serving_quantity || 100,
      serving_unit: (product.serving_unit || product.serving_size || 'g').toLowerCase(),
      source: 'openfoodfacts',
      source_id: product.code || `openfoodfacts-${Date.now()}`,
      barcode: product.code || null
    };

    logger.debug('Transformed OpenFoodFacts food:', transformed);
    return transformed;
  }
}

module.exports = new OpenFoodFactsService();