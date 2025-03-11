const axios = require('axios');

// Test OpenFoodFacts API
async function testOpenFoodFacts() {
  try {
    console.log('Testing OpenFoodFacts API...');
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: 'taco',
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 5
      }
    });

    console.log('OpenFoodFacts API response status:', response.status);
    console.log('OpenFoodFacts results count:', response.data.products?.length || 0);
    if (response.data.products?.length > 0) {
      console.log('First result:', {
        name: response.data.products[0].product_name,
        brand: response.data.products[0].brands
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
    const apiKey = 'jrHM0qobnLkHbRdSATHkU7sBaEqqXcB85R7rTPM7';

    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        query: 'taco',
        pageSize: 5,
        api_key: apiKey
      }
    });

    console.log('USDA API response status:', response.status);
    console.log('USDA results count:', response.data.foods?.length || 0);
    if (response.data.foods?.length > 0) {
      console.log('First result:', {
        name: response.data.foods[0].description,
        brand: response.data.foods[0].brandOwner
      });
    }
  } catch (error) {
    console.error('USDA API error:', error.message);
  }
}

// Run tests
async function runTests() {
  await testOpenFoodFacts();
  await testUSDA();
}

runTests();