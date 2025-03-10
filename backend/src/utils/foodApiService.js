const fetch = require('node-fetch');
const logger = require('../config/logger');

/**
 * Food API Service for external food database APIs
 */
class FoodApiService {
  /**
   * Fetch food data from OpenFoodFacts API by barcode
   * @param {string} barcode - Barcode
   * @returns {Promise<Object|null>} Food data or null
   */
  static async fetchFoodByBarcode(barcode) {
    try {
      logger.info(`Fetching food data for barcode: ${barcode}`);

      // Call OpenFoodFacts API
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1) {
        // Product found, extract and return nutritional information
        logger.info(`Found product in OpenFoodFacts: ${data.product.product_name}`);

        return {
          name: data.product.product_name,
          calories_per_serving: data.product.nutriments['energy-kcal_100g'] || 0,
          protein_grams: data.product.nutriments.proteins_100g || 0,
          carbs_grams: data.product.nutriments.carbohydrates_100g || 0,
          fat_grams: data.product.nutriments.fat_100g || 0,
          serving_size: data.product.serving_size || '100',
          serving_unit: 'g',
          barcode: barcode,
          source: 'openfoodfacts',
          source_id: data.product._id,
        };
      }

      logger.info(`Product not found in OpenFoodFacts for barcode: ${barcode}`);

      // If not found in OpenFoodFacts, try USDA API as fallback
      // This would require a text search since USDA doesn't directly support barcode lookup
      if (data.product && data.product.product_name) {
        return await this.searchUSDAByName(data.product.product_name);
      }

      return null;
    } catch (error) {
      logger.error(`Error fetching food data by barcode: ${error.message}`);
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
      logger.info(`Searching OpenFoodFacts for: ${query}`);

      // Call OpenFoodFacts API
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        logger.info(`Found ${data.products.length} products in OpenFoodFacts`);

        // Map products to our format
        return data.products.map(product => ({
          name: product.product_name,
          calories_per_serving: product.nutriments['energy-kcal_100g'] || 0,
          protein_grams: product.nutriments.proteins_100g || 0,
          carbs_grams: product.nutriments.carbohydrates_100g || 0,
          fat_grams: product.nutriments.fat_100g || 0,
          serving_size: product.serving_size || '100',
          serving_unit: 'g',
          barcode: product.code,
          source: 'openfoodfacts',
          source_id: product._id,
        }));
      }

      logger.info(`No products found in OpenFoodFacts for query: ${query}`);
      return [];
    } catch (error) {
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
      // Check if USDA API key is available
      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        logger.warn('USDA API key not found');
        return returnArray ? [] : null;
      }

      logger.info(`Searching USDA for: ${query}`);

      // Call USDA API
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&api_key=${apiKey}&pageSize=10`
      );
      const data = await response.json();

      if (data.foods && data.foods.length > 0) {
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
            calories_per_serving: getNutrientValue(1008) || 0, // Energy (kcal)
            protein_grams: getNutrientValue(1003) || 0, // Protein
            carbs_grams: getNutrientValue(1005) || 0, // Carbohydrates
            fat_grams: getNutrientValue(1004) || 0, // Total lipid (fat)
            serving_size: food.servingSize || '100',
            serving_unit: food.servingSizeUnit || 'g',
            barcode: null, // USDA doesn't provide barcodes
            source: 'usda',
            source_id: food.fdcId.toString(),
          };
        });

        return returnArray ? mappedFoods : mappedFoods[0];
      }

      logger.info(`No foods found in USDA for query: ${query}`);
      return returnArray ? [] : null;
    } catch (error) {
      logger.error(`Error searching USDA: ${error.message}`);
      return returnArray ? [] : null;
    }
  }

  /**
   * Search for food items using external APIs
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of food items
   */
  static async searchFood(query) {
    try {
      logger.info(`Searching for food with query: ${query}`);

      // Search both APIs in parallel
      const [usdaResults, offResults] = await Promise.all([
        this.searchUSDAByName(query, true),
        this.searchOpenFoodFacts(query)
      ]);

      // Combine results
      const combinedResults = [...usdaResults, ...offResults];

      logger.info(`Found ${combinedResults.length} results for query: ${query}`);
      return combinedResults;
    } catch (error) {
      logger.error(`Error searching food: ${error.message}`);
      return [];
    }
  }
}

module.exports = FoodApiService;