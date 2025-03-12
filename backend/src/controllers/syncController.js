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

  try {
    const syncMetadata = await SyncMetadata.get(req.user.id, device_id);

    res.json({
      sync_status: {
        device_id,
        last_sync_timestamp: syncMetadata ? syncMetadata.last_sync_timestamp : null,
      },
    });
  } catch (error) {
    logger.error(`Error in getSyncStatus: ${error.message}`, {
      userId: req.user.id,
      deviceId: device_id,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Error retrieving sync status', error: error.message });
  }
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

  // Validate required fields
  if (!device_id) {
    return res.status(400).json({ message: 'Device ID is required' });
  }

  if (!changes) {
    return res.status(400).json({ message: 'Changes object is required' });
  }

  // Log sync request details
  logger.info(`Sync request received`, {
    userId: req.user.id,
    deviceId: device_id,
    lastSyncTimestamp: last_sync_timestamp,
    changesCount: {
      foodLogs: changes.food_logs?.length || 0,
      goals: changes.goals?.length || 0
    }
  });

  try {
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
    if (changes.food_logs && Array.isArray(changes.food_logs)) {
      for (const log of changes.food_logs) {
        try {
          // Validate log object
          if (!log.sync_id) {
            logger.warn('Food log missing sync_id', { log });
            continue;
          }

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
            // Validate required fields for new log
            if (!log.food_item_id || !log.log_date || !log.meal_type) {
              logger.warn('Food log missing required fields', { log });
              continue;
            }

            // Create new log
            const newLog = await FoodLog.create({
              user_id: req.user.id,
              food_item_id: log.food_item_id,
              log_date: log.log_date,
              meal_type: log.meal_type,
              servings: log.servings || 1,
              sync_id: log.sync_id,
            });

            if (newLog) {
              processedChanges.food_logs.created.push(newLog);
            }
          }
        } catch (error) {
          logger.error(`Error processing food log change: ${error.message}`, {
            log,
            userId: req.user.id,
            stack: error.stack
          });
          // Continue processing other logs
        }
      }
    }

    // Process goal changes
    if (changes.goals && Array.isArray(changes.goals)) {
      for (const goal of changes.goals) {
        try {
          // Validate goal object
          if (!goal.sync_id) {
            logger.warn('Goal missing sync_id', { goal });
            continue;
          }

          // Check if goal exists by sync_id
          const existingGoal = await Goal.findBySyncId(goal.sync_id, req.user.id);

          if (existingGoal) {
            // Update existing goal
            if (goal.is_deleted) {
              // Soft delete
              await Goal.delete(existingGoal.id, req.user.id);
              processedChanges.goals.deleted.push(existingGoal.id);
            } else {
              // Update - use the Goal model to handle the mapping
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
            // Validate required fields for new goal
            if (goal.daily_calorie_target === undefined) {
              logger.warn('Goal missing required fields', { goal });
              continue;
            }

            // Create new goal - use the Goal model to handle the mapping
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
          logger.error(`Error processing goal change: ${error.message}`, {
            goal,
            userId: req.user.id,
            stack: error.stack
          });
          // Continue processing other goals
        }
      }
    }

    // Get changes from server since last sync
    const serverChanges = {
      food_logs: [],
      goals: [],
    };

    if (last_sync_timestamp) {
      try {
        // Get food logs changed since last sync
        serverChanges.food_logs = await FoodLog.getChangedSince(req.user.id, last_sync_timestamp);
      } catch (error) {
        logger.error(`Error getting food logs changed since last sync: ${error.message}`, {
          userId: req.user.id,
          lastSyncTimestamp: last_sync_timestamp,
          stack: error.stack
        });
        // Continue with empty food logs
      }

      try {
        // Get goals changed since last sync
        serverChanges.goals = await Goal.getChangedSince(req.user.id, last_sync_timestamp);
      } catch (error) {
        logger.error(`Error getting goals changed since last sync: ${error.message}`, {
          userId: req.user.id,
          lastSyncTimestamp: last_sync_timestamp,
          stack: error.stack
        });
        // Continue with empty goals
      }
    }

    // Update sync metadata
    const now = new Date().toISOString();
    await SyncMetadata.upsert(req.user.id, device_id, now);

    // Log sync response details
    logger.info(`Sync completed successfully`, {
      userId: req.user.id,
      deviceId: device_id,
      processedChanges: {
        foodLogs: {
          created: processedChanges.food_logs.created.length,
          updated: processedChanges.food_logs.updated.length,
          deleted: processedChanges.food_logs.deleted.length
        },
        goals: {
          created: processedChanges.goals.created.length,
          updated: processedChanges.goals.updated.length,
          deleted: processedChanges.goals.deleted.length
        }
      },
      serverChanges: {
        foodLogs: serverChanges.food_logs.length,
        goals: serverChanges.goals.length
      }
    });

    res.json({
      sync_timestamp: now,
      processed_changes: processedChanges,
      server_changes: serverChanges,
    });
  } catch (error) {
    logger.error(`Error in syncData: ${error.message}`, {
      userId: req.user.id,
      deviceId: device_id,
      stack: error.stack
    });
    return res.status(500).json({ message: 'Error synchronizing data', error: error.message });
  }
});

module.exports = {
  getSyncStatus,
  syncData,
};