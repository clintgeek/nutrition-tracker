const db = require('../config/db');
const logger = require('../config/logger');

class Weight {
  /**
   * Get weight goal for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Weight goal or null if not found
   */
  static async getWeightGoal(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM weight_goals
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting weight goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or update weight goal
   * @param {Object} goalData - Weight goal data
   * @returns {Promise<Object>} Created or updated weight goal
   */
  static async saveWeightGoal(goalData) {
    const { user_id, target_weight, start_weight, start_date, target_date, sync_id } = goalData;

    try {
      // Check if a goal already exists
      const existingGoal = await this.getWeightGoal(user_id);

      if (existingGoal) {
        // Update existing goal
        const result = await db.query(
          `UPDATE weight_goals
           SET target_weight = $1,
               start_weight = $2,
               start_date = $3,
               target_date = $4,
               sync_id = $5,
               updated_at = NOW()
           WHERE id = $6
           RETURNING *`,
          [target_weight, start_weight, start_date, target_date, sync_id, existingGoal.id]
        );

        return result.rows[0];
      } else {
        // Create new goal
        const result = await db.query(
          `INSERT INTO weight_goals
           (user_id, target_weight, start_weight, start_date, target_date, sync_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [user_id, target_weight, start_weight, start_date, target_date, sync_id]
        );

        return result.rows[0];
      }
    } catch (error) {
      logger.error(`Error saving weight goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get weight logs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of weight logs
   */
  static async getWeightLogs(userId) {
    try {
      // Check if the weight_value column exists
      const checkColumnResult = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'weight_logs' AND column_name = 'weight_value'
      `);

      const hasWeightValueColumn = checkColumnResult.rows.length > 0;

      // Use the appropriate column names based on what exists in the database
      const result = await db.query(
        `SELECT * FROM weight_logs
         WHERE user_id = $1
         ORDER BY ${hasWeightValueColumn ? 'log_date' : 'date'} DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting weight logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a weight log
   * @param {Object} logData - Weight log data
   * @returns {Promise<Object>} Created weight log
   */
  static async addWeightLog(logData) {
    const { user_id, weight, date, notes, sync_id } = logData;

    try {
      // Check if the weight_value column exists
      const checkColumnResult = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'weight_logs' AND column_name = 'weight_value'
      `);

      const hasWeightValueColumn = checkColumnResult.rows.length > 0;

      // Use the appropriate column names based on what exists in the database
      const result = await db.query(
        `INSERT INTO weight_logs
         (user_id, ${hasWeightValueColumn ? 'weight_value' : 'weight'}, ${hasWeightValueColumn ? 'log_date' : 'date'}, notes, sync_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, weight, date, notes, sync_id]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error adding weight log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a weight log
   * @param {string} id - Weight log ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async deleteWeightLog(id, userId) {
    try {
      const result = await db.query(
        `DELETE FROM weight_logs
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting weight log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a weight log by ID
   * @param {string} id - Weight log ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Weight log or null if not found
   */
  static async getWeightLogById(id, userId) {
    try {
      const result = await db.query(
        `SELECT * FROM weight_logs
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting weight log by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest weight log for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Latest weight log or null if not found
   */
  static async getLatestWeightLog(userId) {
    try {
      // Check if the weight_value column exists
      const checkColumnResult = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'weight_logs' AND column_name = 'weight_value'
      `);

      const hasWeightValueColumn = checkColumnResult.rows.length > 0;

      // Use the appropriate column names based on what exists in the database
      const result = await db.query(
        `SELECT * FROM weight_logs
         WHERE user_id = $1
         ORDER BY ${hasWeightValueColumn ? 'log_date' : 'date'} DESC
         LIMIT 1`,
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting latest weight log: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Weight;