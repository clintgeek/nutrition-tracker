/**
 * This script synchronizes environment variables from the root .env.local
 * to the frontend and backend .env.local files when needed for compatibility.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load the root .env.local file
const rootEnvPath = path.resolve(__dirname, '.env.local');
try {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
  console.log('Root .env.local found');

  // Define which variables should be copied to each environment
  const frontendVars = [
    'REACT_APP_API_URL',
    'REACT_APP_ENV',
    'FRONTEND_PORT'
  ];

  const backendVars = [
    'NODE_ENV',
    'BACKEND_PORT',
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'JWT_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'USDA_API_KEY',
    'NUTRITIONIX_APP_ID',
    'NUTRITIONIX_API_KEY',
    'SPOONACULAR_API_KEY',
    'GARMIN_SYNC_INTERVAL'
  ];

  // Parse the root .env file
  const parsed = dotenv.parse(rootEnv);

  // Create frontend .env.local
  const frontendEnvPath = path.resolve(__dirname, 'frontend/.env.local');
  let frontendContent = '# Generated from root .env.local - DO NOT EDIT DIRECTLY\n# Edit the root .env.local file instead\n\n';

  frontendVars.forEach(key => {
    if (parsed[key]) {
      frontendContent += `${key}=${parsed[key]}\n`;
    }
  });

  fs.writeFileSync(frontendEnvPath, frontendContent);
  console.log('Frontend .env.local updated');

  // Create backend .env.local
  const backendEnvPath = path.resolve(__dirname, 'backend/.env.local');
  let backendContent = '# Generated from root .env.local - DO NOT EDIT DIRECTLY\n# Edit the root .env.local file instead\n\n';

  backendVars.forEach(key => {
    if (parsed[key]) {
      backendContent += `${key}=${parsed[key]}\n`;
    }
  });

  fs.writeFileSync(backendEnvPath, backendContent);
  console.log('Backend .env.local updated');

  console.log('Environment files updated successfully');

} catch (error) {
  console.error('Error updating environment files:', error);
  process.exit(1);
}