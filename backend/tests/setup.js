// Load environment variables for testing
require('dotenv').config({ path: '.env.test' });

// Mock console methods to keep test output clean
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set test timeout
jest.setTimeout(10000);