const { validationResult } = require('express-validator');
const SyncMetadata = require('../models/SyncMetadata');
const FoodLog = require('../models/FoodLog');
const Goal = require('../models/Goal');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get sync status
 * @route GET /api/sync/status
 */
const getSyncStatus = asyncHandler(async (req, res) => {
  const { device_id } = req.query;

  if (!device_id) {
    return res.status(400).json({ message: 'Device ID is required' });
  }

  const syncMetadata = await SyncMetadata.get(req.user.id, device_id);

  res.json({
    sync_status: {
      device_id,
      last_sync_timestamp: syncMetadata ? syncMetadata.last_sync_timestamp : null,
    },
  });
});

/**
 * Synchronize data
 * @route POST /api/sync
 */
const syncData = asyncHandler(async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { device_id, last_sync_timestamp, changes } = req.body;

  // Process changes from client
  const processedChanges = {
    food_logs: {
      created: [],
      updated: [],
      deleted: [],
    },
    goals: {
      created: [],
      updated: [],
      deleted: [],
    },
  };

  // Process food log changes
  if (changes.food_logs) {
    for (const log of changes.food_logs) {
      try {
        // Check if log exists by sync_id
        const existingLog = await FoodLog.findBySyncId(log.sync_id, req.user.id);

        if (existingLog) {
          // Update existing log
          if (log.is_deleted) {
            // Soft delete
            await FoodLog.delete(existingLog.id, req.user.id);
            processedChanges.food_logs.deleted.push(existingLog.id);
          } else {
            // Update
            const updatedLog = await FoodLog.update(existingLog.id, req.user.id, {
              meal_type: log.meal_type,
              servings: log.servings,
              log_date: log.log_date,
            });

            if (updatedLog) {
              processedChanges.food_logs.updated.push(updatedLog);
            }
          }
        } else if (!log.is_deleted) {
          // Create new log
          const newLog = await FoodLog.create({
            user_id: req.user.id,
            food_item_id: log.food_item_id,
            log_date: log.log_date,
            meal_type: log.meal_type,
            servings: log.servings,
            sync_id: log.sync_id,
          });

          if (newLog) {
            processedChanges.food_logs.created.push(newLog);
          }
        }
      } catch (error) {
        logger.error(`Error processing food log change: ${error.message}`);
      }
    }
  }

  // Process goal changes
  if (changes.goals) {
    for (const goal of changes.goals) {
      try {
        // Check if goal exists by sync_id
        const existingGoal = await Goal.findBySyncId(goal.sync_id, req.user.id);

        if (existingGoal) {
          // Update existing goal
          if (goal.is_deleted) {
            // Soft delete
            await Goal.delete(existingGoal.id, req.user.id);
            processedChanges.goals.deleted.push(existingGoal.id);
          } else {
            // Update
            const updatedGoal = await Goal.update(existingGoal.id, req.user.id, {
              daily_calorie_target: goal.daily_calorie_target,
              protein_target_grams: goal.protein_target_grams,
              carbs_target_grams: goal.carbs_target_grams,
              fat_target_grams: goal.fat_target_grams,
              start_date: goal.start_date,
              end_date: goal.end_date,
            });

            if (updatedGoal) {
              processedChanges.goals.updated.push(updatedGoal);
            }
          }
        } else if (!goal.is_deleted) {
          // Create new goal
          const newGoal = await Goal.create({
            user_id: req.user.id,
            daily_calorie_target: goal.daily_calorie_target,
            protein_target_grams: goal.protein_target_grams,
            carbs_target_grams: goal.carbs_target_grams,
            fat_target_grams: goal.fat_target_grams,
            start_date: goal.start_date,
            end_date: goal.end_date,
            sync_id: goal.sync_id,
          });

          if (newGoal) {
            processedChanges.goals.created.push(newGoal);
          }
        }
      } catch (error) {
        logger.error(`Error processing goal change: ${error.message}`);
      }
    }
  }

  // Get changes from server since last sync
  const serverChanges = {
    food_logs: [],
    goals: [],
  };

  if (last_sync_timestamp) {
    // Get food logs changed since last sync
    serverChanges.food_logs = await FoodLog.getChangedSince(req.user.id, last_sync_timestamp);

    // Get goals changed since last sync
    serverChanges.goals = await Goal.getChangedSince(req.user.id, last_sync_timestamp);
  }

  // Update sync metadata
  const now = new Date().toISOString();
  await SyncMetadata.upsert(req.user.id, device_id, now);

  res.json({
    sync_timestamp: now,
    processed_changes: processedChanges,
    server_changes: serverChanges,
  });
});

module.exports = {
  getSyncStatus,
  syncData,
};