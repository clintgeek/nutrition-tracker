const axios = require('axios');

// Super simple test for OpenFoodFacts API
async function testOpenFoodFacts() {
  console.log('Testing OpenFoodFacts API with chocolate search...');

  try {
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        search_terms: 'chocolate',
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: 1
      },
      timeout: 10000
    });

    console.log('Response status:', response.status);
    console.log('Results count:', response.data?.count || 0);
    console.log('Success!');

  } catch (error) {
    console.error('Error testing OpenFoodFacts API:');
    console.error(error.message);

    if (error.code === 'ECONNABORTED') {
      console.error('The request timed out. Check your internet connection or try again later.');
    }

    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testOpenFoodFacts();