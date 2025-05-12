const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
const FoodApiService = require('../src/utils/foodApiService');
const logger = require('../src/utils/logger');

async function testFoodSearch() {
  try {
    logger.info('Starting food API test...');

    // Get search query from command line arguments
    const query = process.argv[2] || 'chicken breast';
    logger.info(`Search query: ${query}`);

    let results;
    if (query.startsWith('barcode:')) {
      // Handle barcode search
      const barcode = query.replace('barcode:', '').trim();
      logger.info(`Searching by barcode: ${barcode}`);

      const food = await FoodApiService.fetchFoodByBarcode(barcode);
      if (food) {
        results = {
          foods: [food],
          stats: {
            total: 1,
            sources: { [food.source]: 1 },
            quality_scores: {
              min: food.quality_score,
              max: food.quality_score,
              avg: food.quality_score
            }
          }
        };
      } else {
        logger.info('No food found with this barcode');
        return;
      }
    } else {
      // Regular text search
      results = await FoodApiService.searchFood(query, {
        limit: 5,  // Limit to 5 results for testing
        offset: 0
      });
    }

    // Log results
    logger.info('\nSearch Results:');
    logger.info('===============');
    logger.info(`Total results: ${results.stats.total}`);
    logger.info('\nResults by source:');
    Object.entries(results.stats.sources).forEach(([source, count]) => {
      logger.info(`${source}: ${count} items`);
    });

    logger.info('\nQuality Score Stats:');
    logger.info(`Min: ${results.stats.quality_scores.min}`);
    logger.info(`Max: ${results.stats.quality_scores.max}`);
    logger.info(`Avg: ${results.stats.quality_scores.avg}`);

    logger.info('\nTop Results:');
    logger.info('============');
    results.foods.forEach((food, index) => {
      logger.info(`\n${index + 1}. ${food.name}`);
      logger.info(`   Source: ${food.source}`);
      logger.info(`   Brand: ${food.brand || 'N/A'}`);
      logger.info(`   Barcode: ${food.barcode || 'N/A'}`);
      logger.info(`   Quality Score: ${food.quality_score}`);
      logger.info(`   Serving: ${food.serving_size} ${food.serving_unit}`);
      logger.info('   Nutrition:');
      logger.info(`   - Calories: ${food.calories}`);
      logger.info(`   - Protein: ${food.protein}g`);
      logger.info(`   - Carbs: ${food.carbs}g`);
      logger.info(`   - Fat: ${food.fat}g`);
    });

  } catch (error) {
    logger.error('Error in test:', error);
  }
}

// Run the test
testFoodSearch();