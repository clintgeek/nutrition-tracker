const axios = require('axios');
require('dotenv').config();

// Log environment variables
console.log('Environment variables:');
console.log('USDA_API_KEY:', process.env.USDA_API_KEY ? 'Present' : 'Missing');
console.log('NUTRITIONIX_APP_ID:', process.env.NUTRITIONIX_APP_ID ? 'Present' : 'Missing');
console.log('NUTRITIONIX_API_KEY:', process.env.NUTRITIONIX_API_KEY ? 'Present' : 'Missing');

// API endpoints
const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org';
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1';
const NUTRITIONIX_API_URL = 'https://trackapi.nutritionix.com/v2';

// Test query
const query = 'taco';

// Test OpenFoodFacts API
async function testOpenFoodFacts() {
  try {
    console.log('\nTesting OpenFoodFacts API...');
    const response = await axios.get(`${OPENFOODFACTS_API_URL}/cgi/search.pl`, {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 5,
        fields: 'code,product_name,brands,nutriments'
      }
    });

    console.log('OpenFoodFacts API response status:', response.status);
    console.log('OpenFoodFacts results count:', response.data.products?.length || 0);
    if (response.data.products?.length > 0) {
      console.log('First result:', {
        name: response.data.products[0].product_name,
        brand: response.data.products[0].brands,
        nutrients: Object.keys(response.data.products[0].nutriments || {}).slice(0, 5)
      });
    }
  } catch (error) {
    console.error('OpenFoodFacts API error:', error.message);
  }
}

// Test USDA API
async function testUSDA() {
  try {
    console.log('\nTesting USDA API...');
    if (!process.env.USDA_API_KEY) {
      console.log('USDA API key not found, skipping test');
      return;
    }

    const response = await axios.get(`${USDA_API_URL}/foods/search`, {
      params: {
        query,
        pageSize: 5,
        api_key: process.env.USDA_API_KEY,
        dataType: ['Survey (FNDDS)', 'SR Legacy', 'Branded']
      }
    });

    console.log('USDA API response status:', response.status);
    console.log('USDA results count:', response.data.foods?.length || 0);
    if (response.data.foods?.length > 0) {
      console.log('First result:', {
        name: response.data.foods[0].description,
        brand: response.data.foods[0].brandOwner,
        nutrients: response.data.foods[0].foodNutrients?.slice(0, 5).map(n => n.nutrientName)
      });
    }
  } catch (error) {
    console.error('USDA API error:', error.message);
  }
}

// Test Nutritionix API
async function testNutritionix() {
  try {
    console.log('\nTesting Nutritionix API...');
    if (!process.env.NUTRITIONIX_APP_ID || !process.env.NUTRITIONIX_API_KEY) {
      console.log('Nutritionix API credentials not found, skipping test');
      return;
    }

    const response = await axios.get(`${NUTRITIONIX_API_URL}/search/instant`, {
      params: {
        query,
        detailed: true,
        branded: true,
        common: true,
        self: false
      },
      headers: {
        'x-app-id': process.env.NUTRITIONIX_APP_ID,
        'x-app-key': process.env.NUTRITIONIX_API_KEY
      }
    });

    console.log('Nutritionix API response status:', response.status);
    const totalResults = (response.data.common?.length || 0) + (response.data.branded?.length || 0);
    console.log('Nutritionix results count:', totalResults);

    if (response.data.common?.length > 0) {
      console.log('First common result:', {
        name: response.data.common[0].food_name,
        nutrients: response.data.common[0].full_nutrients?.slice(0, 5).map(n => n.attr_id)
      });
    }

    if (response.data.branded?.length > 0) {
      console.log('First branded result:', {
        name: response.data.branded[0].food_name,
        brand: response.data.branded[0].brand_name,
        nutrients: response.data.branded[0].full_nutrients?.slice(0, 5).map(n => n.attr_id)
      });
    }
  } catch (error) {
    console.error('Nutritionix API error:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testOpenFoodFacts();
  await testUSDA();
  await testNutritionix();
}

runTests();