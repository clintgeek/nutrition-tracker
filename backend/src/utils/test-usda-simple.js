const axios = require('axios');
require('dotenv').config();

// Get the API key from environment variables
const apiKey = process.env.USDA_API_KEY;
console.log('API Key:', apiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : 'Missing');

// Test the USDA API
axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
  params: {
    query: 'apple',
    pageSize: 25,
    api_key: apiKey,
    dataType: 'Foundation,SR Legacy,Survey (FNDDS),Branded'
  },
  timeout: 30000 // 30 seconds timeout
})
.then(response => {
  console.log('Success! Status:', response.status);
  console.log('Total hits:', response.data.totalHits);
  console.log('Foods count:', response.data.foods ? response.data.foods.length : 0);

  if (response.data.foods && response.data.foods.length > 0) {
    console.log('First food:', response.data.foods[0].description);
  }
})
.catch(error => {
  console.error('Error testing USDA API:');
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response data:', error.response.data);
  } else {
    console.error('Error message:', error.message);
  }
});