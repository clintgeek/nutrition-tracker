const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const foodRoutes = require('./routes/foodRoutes');
const logRoutes = require('./routes/logRoutes');
const goalRoutes = require('./routes/goalRoutes');
const syncRoutes = require('./routes/syncRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const weightRoutes = require('./routes/weightRoutes');
const bloodPressureRoutes = require('./routes/bloodPressure');
const mealPlansRouter = require('./routes/mealPlans');
const loggingRouter = require('./routes/logging');
const userPreferencesRoutes = require('./routes/userPreferencesRoutes');
const fitnessRoutes = require('./routes/fitnessRoutes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/weight', weightRoutes);
app.use('/api/blood-pressure', bloodPressureRoutes);
app.use('/api/meal-plans', mealPlansRouter);
app.use('/api/logging', loggingRouter);
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/fitness', fitnessRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;