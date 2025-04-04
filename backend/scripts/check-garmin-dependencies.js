#!/usr/bin/env node

/**
 * Garmin Dependencies Check Script
 * Verifies all dependencies required for Garmin integration are properly installed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======= Garmin Integration Dependency Check =======');

// Get environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENABLE_GARMIN_API = process.env.ENABLE_GARMIN_API !== 'false';
const ENABLE_GARMIN_API_IN_DEV = process.env.ENABLE_GARMIN_API_IN_DEV === 'true';
const isProd = NODE_ENV === 'production';
const isDevMode = NODE_ENV === 'development';

console.log(`Environment: ${NODE_ENV}`);
console.log(`Garmin API Enabled: ${ENABLE_GARMIN_API}`);
console.log(`Garmin API Enabled in Dev: ${ENABLE_GARMIN_API_IN_DEV}`);

// Skip checks if Garmin API is disabled
if (!ENABLE_GARMIN_API || (isDevMode && !ENABLE_GARMIN_API_IN_DEV)) {
  console.log('Garmin API is disabled - skipping dependency checks');
  console.log('======= Dependency Check Complete =======');
  process.exit(0);
}

// Define paths
const ROOT_DIR = path.resolve(__dirname, '..');
const PYTHON_PATH = process.env.PYTHON_PATH ||
  (isDevMode
    ? path.join(ROOT_DIR, 'venv/bin/python3')
    : '/usr/bin/python3');
const SCRIPT_PATH = path.join(ROOT_DIR, 'src/python/garmin/garmin_service.py');
const REQUIREMENTS_PATH = path.join(ROOT_DIR, 'requirements-garmin.txt');

// Check Python executable
console.log('\nChecking Python executable...');
try {
  if (fs.existsSync(PYTHON_PATH)) {
    console.log(`✅ Python executable found at: ${PYTHON_PATH}`);

    // Try to run Python to check version
    try {
      const pythonVersion = execSync(`${PYTHON_PATH} --version`).toString().trim();
      console.log(`✅ Python version: ${pythonVersion}`);
    } catch (error) {
      console.error(`❌ Error running Python: ${error.message}`);
    }
  } else {
    console.error(`❌ Python executable NOT found at: ${PYTHON_PATH}`);
  }
} catch (error) {
  console.error(`❌ Error checking Python executable: ${error.message}`);
}

// Check Python script
console.log('\nChecking Garmin Python script...');
try {
  if (fs.existsSync(SCRIPT_PATH)) {
    console.log(`✅ Garmin script found at: ${SCRIPT_PATH}`);

    // Check permissions
    try {
      const stats = fs.statSync(SCRIPT_PATH);
      const isExecutable = !!(stats.mode & 0o111);
      if (isExecutable) {
        console.log('✅ Script has executable permissions');
      } else {
        console.error('❌ Script does NOT have executable permissions');
      }
    } catch (error) {
      console.error(`❌ Error checking script permissions: ${error.message}`);
    }
  } else {
    console.error(`❌ Garmin script NOT found at: ${SCRIPT_PATH}`);
  }
} catch (error) {
  console.error(`❌ Error checking Garmin script: ${error.message}`);
}

// Check requirements file
console.log('\nChecking requirements file...');
try {
  if (fs.existsSync(REQUIREMENTS_PATH)) {
    console.log(`✅ Requirements file found at: ${REQUIREMENTS_PATH}`);

    // Read requirements content
    try {
      const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8');
      const packageCount = requirements.split('\n').filter(line => line.trim() && !line.startsWith('#')).length;
      console.log(`✅ Requirements file contains ${packageCount} packages`);
    } catch (error) {
      console.error(`❌ Error reading requirements file: ${error.message}`);
    }
  } else {
    console.error(`❌ Requirements file NOT found at: ${REQUIREMENTS_PATH}`);
  }
} catch (error) {
  console.error(`❌ Error checking requirements file: ${error.message}`);
}

// Try to check installed pip packages if on same system as Python
console.log('\nChecking Python packages...');
try {
  const pipList = execSync(`${PYTHON_PATH} -m pip list`).toString();
  console.log('✅ Python packages installed:');
  console.log(pipList);
} catch (error) {
  console.error(`❌ Error checking installed Python packages: ${error.message}`);
}

console.log('\n======= Dependency Check Complete =======');