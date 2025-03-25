const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userPreferencesController = require('../controllers/userPreferencesController');

// Apply authentication middleware to all routes in this router
router.use(authenticate);

// Define routes
router.get('/home-screen-layout', userPreferencesController.getHomeScreenLayout);
router.put('/home-screen-layout', userPreferencesController.updateHomeScreenLayout);

module.exports = router;