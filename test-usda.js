const axios = require('axios');

// Test USDA API
async function testUSDA() {
  try {
    console.log('Testing USDA API...');
    const apiKey = 'jrHM0qobnLkHbRdSATHkU7sBaEqqXcB85R7rTPM7';
    const query = 'taco';

    console.log('Request URL:', 'https://api.nal.usda.gov/fdc/v1/foods/search');
    console.log('Request params:', {
      query,
      pageSize: 25,
      pageNumber: 1,
      api_key: apiKey,
      dataType: 'Survey (FNDDS),SR Legacy,Branded'
    });

    const response = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        query,
        pageSize: 25,
        pageNumber: 1,
        api_key: apiKey,
        dataType: 'Survey (FNDDS),SR Legacy,Branded'
      }
    });

    console.log('USDA API response status:', response.status);
    console.log('USDA results count:', response.data.foods?.length || 0);
    if (response.data.foods?.length > 0) {
      console.log('First result:', {
        name: response.data.foods[0].description,
        brand: response.data.foods[0].brandOwner,
        nutrients: response.data.foods[0].foodNutrients?.slice(0, 3).map(n => n.nutrientName)
      });
    }
  } catch (error) {
    console.error('USDA API error:', error.message);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Error request:', error.request);
    }
  }
}

// Run test
testUSDA();