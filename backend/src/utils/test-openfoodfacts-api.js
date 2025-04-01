const axios = require('axios');
const logger = require('./logger');

/**
 * Test script for OpenFoodFacts API connectivity
 */
async function testOpenFoodFactsAPI() {
  const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org';

  console.log('Testing OpenFoodFacts API...');
  console.log('============================');

  try {
    // Test 1: Search by product name
    console.log('\n1. Testing search by product name');
    console.log('-------------------------------');
    const searchResponse = await axios.get(`${OPENFOODFACTS_API_URL}/cgi/search.pl`, {
      params: {
        search_terms: 'chocolate',
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 5,
        fields: 'code,product_name,brands,nutriments'
      },
      timeout: 10000
    });

    if (searchResponse.data?.products?.length > 0) {
      console.log(`✅ Search successful: Found ${searchResponse.data.products.length} products`);
      console.log('First result:');
      const firstProduct = searchResponse.data.products[0];
      console.log({
        code: firstProduct.code,
        name: firstProduct.product_name,
        brand: firstProduct.brands,
        calories: firstProduct.nutriments?.['energy-kcal_100g'] || 'N/A',
        protein: firstProduct.nutriments?.proteins_100g || 'N/A',
        carbs: firstProduct.nutriments?.carbohydrates_100g || 'N/A',
        fat: firstProduct.nutriments?.fat_100g || 'N/A'
      });
    } else {
      console.log('❌ Search returned no results');
    }

    // Test 2: Get product by barcode
    console.log('\n2. Testing product lookup by barcode');
    console.log('-----------------------------------');
    // Using a common test barcode (Coca-Cola)
    const barcode = '5449000000996';
    const barcodeResponse = await axios.get(`${OPENFOODFACTS_API_URL}/api/v0/product/${barcode}.json`, {
      timeout: 10000
    });

    if (barcodeResponse.data?.product) {
      console.log('✅ Barcode lookup successful');
      console.log('Product:');
      const product = barcodeResponse.data.product;
      console.log({
        code: product.code,
        name: product.product_name,
        brand: product.brands,
        calories: product.nutriments?.['energy-kcal_100g'] || 'N/A',
        protein: product.nutriments?.proteins_100g || 'N/A',
        carbs: product.nutriments?.carbohydrates_100g || 'N/A',
        fat: product.nutriments?.fat_100g || 'N/A'
      });
    } else {
      console.log('❌ Barcode lookup returned no results');
    }

    console.log('\n✅ All OpenFoodFacts API tests completed successfully');
  } catch (error) {
    console.error('❌ Error testing OpenFoodFacts API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Error response: ${error.message}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. This may indicate network connectivity issues.');
      console.error(`Timeout: ${error.code === 'ECONNABORTED' ? 'Yes' : 'No'}`);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error details:', error.message);
    }
  }
}

// Execute the test
testOpenFoodFactsAPI();

module.exports = { testOpenFoodFactsAPI };