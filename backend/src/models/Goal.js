const db = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Goal model for database operations
 */
class Goal {
  /**
   * Create a new goal
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object>} Created goal
   */
  static async create(goalData) {
    try {
      const {
        user_id,
        daily_calorie_target,
        protein_target_grams,
        carbs_target_grams,
        fat_target_grams,
        start_date,
        sync_id = uuidv4(),
      } = goalData;

      const result = await db.query(
        `INSERT INTO nutrition_goals
         (user_id, calories, protein_grams, carbs_grams,
          fat_grams, start_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          user_id,
          daily_calorie_target,
          protein_target_grams,
          carbs_target_grams,
          fat_target_grams,
          start_date,
        ]
      );

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id,
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error creating goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find goal by ID
   * @param {number} id - Goal ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Goal or null
   */
  static async findById(id, userId) {
    try {
      const result = await db.query(
        'SELECT * FROM nutrition_goals WHERE id = $1 AND user_id = $2 AND is_deleted = false',
        [id, userId]
      );

      if (!result.rows[0]) return null;

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id: uuidv4(),
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error finding goal by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current goal
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Current goal or null
   */
  static async getCurrent(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM nutrition_goals
         WHERE user_id = $1 AND is_deleted = false
         ORDER BY start_date DESC
         LIMIT 1`,
        [userId]
      );

      if (!result.rows[0]) return null;

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id: uuidv4(),
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error getting current goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get goal for a specific date
   * @param {number} userId - User ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @returns {Promise<Object|null>} Goal or null
   */
  static async getForDate(userId, date) {
    try {
      const result = await db.query(
        `SELECT * FROM nutrition_goals
         WHERE user_id = $1 AND is_deleted = false
         AND (start_date IS NULL OR start_date <= $2)
         ORDER BY start_date DESC
         LIMIT 1`,
        [userId, date]
      );

      if (!result.rows[0]) return null;

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id: uuidv4(),
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error getting goal for date: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all goals
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Goals
   */
  static async getAll(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM nutrition_goals
         WHERE user_id = $1 AND is_deleted = false
         ORDER BY start_date DESC`,
        [userId]
      );

      return result.rows.map(dbGoal => ({
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id: uuidv4(),
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      }));
    } catch (error) {
      logger.error(`Error getting all goals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update goal
   * @param {number} id - Goal ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} goalData - Goal data
   * @returns {Promise<Object|null>} Updated goal or null
   */
  static async update(id, userId, goalData) {
    try {
      const {
        daily_calorie_target,
        protein_target_grams,
        carbs_target_grams,
        fat_target_grams,
        start_date,
        sync_id = uuidv4(),
      } = goalData;

      const result = await db.query(
        `UPDATE nutrition_goals
         SET calories = $1,
             protein_grams = $2,
             carbs_grams = $3,
             fat_grams = $4,
             start_date = $5,
             updated_at = NOW()
         WHERE id = $6 AND user_id = $7 AND is_deleted = false
         RETURNING *`,
        [
          daily_calorie_target,
          protein_target_grams,
          carbs_target_grams,
          fat_target_grams,
          start_date,
          id,
          userId,
        ]
      );

      if (!result.rows[0]) return null;

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id,
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error updating goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete goal
   * @param {number} id - Goal ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, userId) {
    try {
      const result = await db.query(
        `UPDATE nutrition_goals
         SET is_deleted = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND is_deleted = false
         RETURNING id`,
        [id, userId]
      );

      return !!result.rows[0];
    } catch (error) {
      logger.error(`Error deleting goal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get goals changed since a specific timestamp
   * @param {number} userId - User ID
   * @param {string} timestamp - Timestamp
   * @returns {Promise<Array>} Changed goals
   */
  static async getChangedSince(userId, timestamp) {
    try {
      const result = await db.query(
        `SELECT * FROM nutrition_goals
         WHERE user_id = $1 AND updated_at > $2
         ORDER BY updated_at`,
        [userId, timestamp]
      );

      return result.rows.map(dbGoal => ({
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id: uuidv4(),
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      }));
    } catch (error) {
      logger.error(`Error getting changed goals: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find goal by sync ID
   * @param {string} syncId - Sync ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} Goal or null
   */
  static async findBySyncId(syncId, userId) {
    try {
      const result = await db.query(
        `SELECT * FROM nutrition_goals
         WHERE user_id = $1`,
        [userId]
      );

      if (!result.rows[0]) return null;

      const dbGoal = result.rows[0];
      return {
        id: dbGoal.id,
        user_id: dbGoal.user_id,
        daily_calorie_target: dbGoal.calories,
        protein_target_grams: dbGoal.protein_grams,
        carbs_target_grams: dbGoal.carbs_grams,
        fat_target_grams: dbGoal.fat_grams,
        start_date: dbGoal.start_date,
        sync_id,
        is_deleted: dbGoal.is_deleted,
        created_at: dbGoal.created_at,
        updated_at: dbGoal.updated_at
      };
    } catch (error) {
      logger.error(`Error finding goal by sync ID: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Goal;