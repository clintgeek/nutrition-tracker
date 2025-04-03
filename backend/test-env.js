// Simple test to check environment variables
require('dotenv').config({ path: '.env.local' }); // Explicitly load from .env.local

console.log('Environment test:');
console.log('.env.local path:', require('path').resolve(__dirname, '.env.local'));
console.log('SPOONACULAR_API_KEY:', process.env.SPOONACULAR_API_KEY);
console.log('First 10 chars:', process.env.SPOONACULAR_API_KEY ?
  process.env.SPOONACULAR_API_KEY.substring(0, 10) + '...' : 'Not found');