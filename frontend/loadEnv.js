// Load environment variables from the root .env.local file
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load variables from the root .env.local file
const result = dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

if (result.error) {
  console.error('Error loading .env.local file:', result.error);
} else {
  console.log('Successfully loaded environment variables from root .env.local');

  // Optionally, you can also modify process.env to add EXPO_ prefix to variables
  // that should be accessible in the Expo app
  const exposedVars = [
    'REACT_APP_API_URL',
    'REACT_APP_ENV'
  ];

  exposedVars.forEach(key => {
    if (process.env[key]) {
      process.env[`EXPO_${key}`] = process.env[key];
    }
  });
}