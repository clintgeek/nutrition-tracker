const axios = require('axios');
require('dotenv').config();

async function testUSDAAPI() {
  const apiKey = process.env.USDA_API_KEY;
  const query = 'apple';
  const url = 'https://api.nal.usda.gov/fdc/v1/foods/search';

  console.log('Testing USDA API...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'Missing');
  console.log('URL:', url);
  console.log('Query:', query);

  try {
    console.log('Making request...');
    const response = await axios.get(url, {
      params: {
        query,
        pageSize: 25,
        pageNumber: 1,
        api_key: apiKey,
        dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded'
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('Response status:', response.status);
    console.log('Response data:', {
      totalHits: response.data.totalHits,
      currentPage: response.data.currentPage,
      totalPages: response.data.totalPages,
      foodsCount: response.data.foods ? response.data.foods.length : 0
    });

    if (response.data.foods && response.data.foods.length > 0) {
      console.log('First food item:', {
        description: response.data.foods[0].description,
        fdcId: response.data.foods[0].fdcId,
        dataType: response.data.foods[0].dataType,
        nutrients: response.data.foods[0].foodNutrients ?
          response.data.foods[0].foodNutrients.slice(0, 3).map(n => ({
            id: n.nutrientId,
            name: n.nutrientName,
            value: n.value,
            unit: n.unitName
          })) : 'No nutrients'
      });
    } else {
      console.log('No foods found');
    }
  } catch (error) {
    console.error('Error testing USDA API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    console.error('Error config:', error.config);
  }
}

// Run the test
testUSDAAPI();