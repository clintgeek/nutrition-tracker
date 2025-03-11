require('dotenv').config();
const nutritionixService = require('../utils/nutritionixService');

async function testNutritionix() {
  try {
    // Test barcode lookup
    console.log('=== Testing Barcode Lookup ===');
    console.log('Looking up Coca-Cola (049000006346)...');
    const barcodeResult = await nutritionixService.searchByUPC('049000006346');
    console.log('Result:', JSON.stringify(barcodeResult, null, 2));

    // Test name search
    console.log('\n=== Testing Name Search ===');
    const testQueries = [
      '1 medium apple',
      '1 medium banana',
      '4 oz grilled chicken breast'
    ];

    for (const query of testQueries) {
      console.log(`\nSearching for "${query}"...`);
      const searchResult = await nutritionixService.searchByName(query);
      if (searchResult.length > 0) {
        console.log(`Found ${searchResult.length} results. First result:`);
        console.log(JSON.stringify(searchResult[0], null, 2));
      } else {
        console.log('No results found.');
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNutritionix();