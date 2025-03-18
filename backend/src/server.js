require('dotenv').config();
const app = require('./app');
const logger = require('./config/logger');

// Get port from environment or use default
const PORT = process.env.BACKEND_PORT || 4081;

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});