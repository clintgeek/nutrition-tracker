import express from 'express';
import { PrismaClient } from '@prisma/client';
import ical from 'ical-generator';

const router = express.Router();
const prisma = new PrismaClient();

// ... existing endpoints ...

// Generate iCal feed
router.get('/ical', async (req, res) => {
  try {
    // Create new iCal calendar
    const calendar = ical({
      name: 'Shared Meal Planner',
      timezone: 'UTC',
      prodId: '//NutritionTracker//MealPlanner//EN'
    });

    // Get all meals (no user filter)
    const meals = await prisma.meal.findMany();

    // Add each meal as an event
    meals.forEach(meal => {
      calendar.createEvent({
        start: new Date(meal.date),
        summary: meal.name,
        description: meal.name,
        allDay: true
      });
    });

    // Set headers for iCal file
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename=meals.ics');

    // Send the iCal feed
    res.send(calendar.toString());
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    res.status(500).json({ error: 'Failed to generate iCal feed' });
  }
});

export default router;