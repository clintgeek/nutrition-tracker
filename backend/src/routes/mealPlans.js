const express = require('express');
const router = express.Router();
const MealPlan = require('../models/MealPlan');
const logger = require('../config/logger');
const ical = require('ical-generator');

// Get meal plans for a specific date
router.get('/date/:date', async (req, res) => {
  try {
    const mealPlans = await MealPlan.findByDate(req.params.date);
    res.json(mealPlans);
  } catch (err) {
    logger.error(`Error getting meal plans: ${err.message}`);
    res.status(500).json({ error: 'Failed to get meal plans' });
  }
});

// Get meal plans for a date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const mealPlans = await MealPlan.getByDateRange(startDate, endDate);
    res.json(mealPlans);
  } catch (err) {
    logger.error(`Error getting meal plans by range: ${err.message}`);
    res.status(500).json({ error: 'Failed to get meal plans' });
  }
});

// Create a new meal plan
router.post('/', async (req, res) => {
  try {
    const mealPlan = await MealPlan.create({
      ...req.body,
      user_id: 1 // Use a default user ID for shared meal plans
    });
    res.status(201).json(mealPlan);
  } catch (err) {
    logger.error(`Error creating meal plan: ${err.message}`);
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
});

// Update a meal plan
router.put('/:id', async (req, res) => {
  try {
    const mealPlan = await MealPlan.update(req.params.id, req.body);
    if (!mealPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    res.json(mealPlan);
  } catch (err) {
    logger.error(`Error updating meal plan: ${err.message}`);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// Delete a meal plan
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await MealPlan.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    res.status(204).send();
  } catch (err) {
    logger.error(`Error deleting meal plan: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// Generate iCal feed
router.get('/ical', async (req, res) => {
  try {
    // Create new iCal calendar
    const calendar = ical({
      name: 'Shared Meal Planner',
      timezone: 'UTC',
      prodId: '//NutritionTracker//MealPlanner//EN'
    });

    // Get all meal plans for the next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const mealPlans = await MealPlan.getByDateRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // Add each meal plan as an event
    mealPlans.forEach(meal => {
      calendar.createEvent({
        start: new Date(meal.date),
        summary: meal.name,
        description: `${meal.name} (${meal.meal_type})`,
        allDay: true
      });
    });

    // Set headers for iCal file
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename=meals.ics');

    // Send the iCal feed
    res.send(calendar.toString());
  } catch (err) {
    logger.error(`Error generating iCal feed: ${err.message}`);
    res.status(500).json({ error: 'Failed to generate iCal feed' });
  }
});

module.exports = router;