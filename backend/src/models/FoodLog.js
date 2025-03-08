const db = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * FoodLog model for database operations
 */
class FoodLog {
  /**
   * Create a new food log entry
   * @param {Object} logData - Food log data
   * @returns {Promise<Object>} Created food log
   */
  static async create(logData) {
    try {
      const {
        user_id,
        food_item_id,
        log_date,
        meal_type,
        servings,
        sync_id = uuidv4(),
      } = logData;

      const result = await db.query(
        `INSERT INTO food_logs
         (user_id, food_item_id, log_date, meal_type, servings, sync_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, food_item_id, log_date, meal_type, servings, sync_id]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating food log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find food log by ID
   * @param {number} id - Food log ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Food log or null
   */
  static async findById(id, userId) {
    try {
      const result = await db.query(
        `SELECT fl.*, fi.name as food_name, fi.calories_per_serving,
                fi.protein_grams, fi.carbs_grams, fi.fat_grams,
                fi.serving_size, fi.serving_unit
         FROM food_logs fl
         JOIN food_items fi ON fl.food_item_id = fi.id
         WHERE fl.id = $1 AND fl.user_id = $2 AND fl.is_deleted = false`,
        [id, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding food log by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get food logs for a specific date
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Array>} Food logs
   */
  static async getByDate(userId, date) {
    try {
      const result = await db.query(
        `SELECT fl.*, fi.name as food_name, fi.calories_per_serving,
                fi.protein_grams, fi.carbs_grams, fi.fat_grams,
                fi.serving_size, fi.serving_unit
         FROM food_logs fl
         JOIN food_items fi ON fl.food_item_id = fi.id
         WHERE fl.user_id = $1 AND fl.log_date = $2 AND fl.is_deleted = false
         ORDER BY fl.meal_type, fl.created_at`,
        [userId, date]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting food logs by date: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get food logs for a date range
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} Food logs
   */
  static async getByDateRange(userId, startDate, endDate) {
    try {
      const result = await db.query(
        `SELECT fl.*, fi.name as food_name, fi.calories_per_serving,
                fi.protein_grams, fi.carbs_grams, fi.fat_grams,
                fi.serving_size, fi.serving_unit
         FROM food_logs fl
         JOIN food_items fi ON fl.food_item_id = fi.id
         WHERE fl.user_id = $1 AND fl.log_date BETWEEN $2 AND $3 AND fl.is_deleted = false
         ORDER BY fl.log_date, fl.meal_type, fl.created_at`,
        [userId, startDate, endDate]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting food logs by date range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update food log
   * @param {number} id - Food log ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} logData - Food log data
   * @returns {Promise<Object|null>} Updated food log or null
   */
  static async update(id, userId, logData) {
    try {
      const {
        meal_type,
        servings,
        log_date,
      } = logData;

      const result = await db.query(
        `UPDATE food_logs
         SET meal_type = $1, servings = $2, log_date = $3, updated_at = NOW()
         WHERE id = $4 AND user_id = $5 AND is_deleted = false
         RETURNING *`,
        [meal_type, servings, log_date, id, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating food log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete food log (soft delete)
   * @param {number} id - Food log ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id, userId) {
    try {
      const result = await db.query(
        `UPDATE food_logs
         SET is_deleted = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting food log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get daily summary
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object>} Daily summary
   */
  static async getDailySummary(userId, date) {
    try {
      const result = await db.query(
        `SELECT
           SUM(fi.calories_per_serving * fl.servings) as total_calories,
           SUM(fi.protein_grams * fl.servings) as total_protein,
           SUM(fi.carbs_grams * fl.servings) as total_carbs,
           SUM(fi.fat_grams * fl.servings) as total_fat,
           COUNT(fl.id) as total_items
         FROM food_logs fl
         JOIN food_items fi ON fl.food_item_id = fi.id
         WHERE fl.user_id = $1 AND fl.log_date = $2 AND fl.is_deleted = false`,
        [userId, date]
      );

      return result.rows[0] || {
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0,
        total_items: 0,
      };
    } catch (error) {
      logger.error(`Error getting daily summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get logs changed since a specific timestamp
   * @param {number} userId - User ID
   * @param {string} timestamp - Timestamp
   * @returns {Promise<Array>} Changed logs
   */
  static async getChangedSince(userId, timestamp) {
    try {
      const result = await db.query(
        `SELECT fl.*, fi.name as food_name
         FROM food_logs fl
         JOIN food_items fi ON fl.food_item_id = fi.id
         WHERE fl.user_id = $1 AND fl.updated_at > $2
         ORDER BY fl.updated_at`,
        [userId, timestamp]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting changed logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find food log by sync ID
   * @param {string} syncId - Sync ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Food log or null
   */
  static async findBySyncId(syncId, userId) {
    try {
      const result = await db.query(
        `SELECT * FROM food_logs
         WHERE sync_id = $1 AND user_id = $2`,
        [syncId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding food log by sync ID: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FoodLog;