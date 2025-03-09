const { getPool } = require('../utils/database');
const logger = require('../config/logger');

class FoodLog {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.food_item_id = data.food_item_id;
    this.log_date = data.log_date;
    this.meal_type = data.meal_type;
    this.servings = data.servings;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;

    // Additional fields from joins
    this.food_name = data.food_name;
    this.calories_per_serving = data.calories_per_serving;
    this.protein_grams = data.protein_grams;
    this.carbs_grams = data.carbs_grams;
    this.fat_grams = data.fat_grams;
  }

  // Get logs for a specific date
  static async getByDate(userId, date) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams, fi.carbs_grams, fi.fat_grams
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.user_id = $1 AND fl.log_date = $2
        ORDER BY fl.created_at DESC`,
        [userId, date]
      );

      return result.rows.map(row => new FoodLog(row));
    } catch (err) {
      logger.error(`Error getting logs by date: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  // Get logs for a date range
  static async getByDateRange(userId, startDate, endDate) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams, fi.carbs_grams, fi.fat_grams
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.user_id = $1 AND fl.log_date BETWEEN $2 AND $3
        ORDER BY fl.log_date, fl.created_at`,
        [userId, startDate, endDate]
      );

      return result.rows.map(row => new FoodLog(row));
    } catch (err) {
      logger.error(`Error getting logs by date range: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  // Create a new log
  static async create(logData) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        `INSERT INTO food_logs (user_id, food_item_id, log_date, meal_type, servings)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id`,
        [
          logData.user_id,
          logData.food_item_id,
          logData.log_date,
          logData.meal_type,
          logData.servings
        ]
      );

      // Get the full log with food item details
      const logId = result.rows[0].id;
      const logResult = await pool.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams, fi.carbs_grams, fi.fat_grams
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.id = $1`,
        [logId]
      );

      return new FoodLog(logResult.rows[0]);
    } catch (err) {
      logger.error(`Error creating log: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  // Update a log
  static async update(id, userId, logData) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        `UPDATE food_logs
        SET meal_type = $1, servings = $2, log_date = $3, updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING id`,
        [
          logData.meal_type,
          logData.servings,
          logData.log_date,
          id,
          userId
        ]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Get the full log with food item details
      const logResult = await pool.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams, fi.carbs_grams, fi.fat_grams
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.id = $1`,
        [id]
      );

      return new FoodLog(logResult.rows[0]);
    } catch (err) {
      logger.error(`Error updating log: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  // Delete a log
  static async delete(id, userId) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        'DELETE FROM food_logs WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      return result.rows.length > 0;
    } catch (err) {
      logger.error(`Error deleting log: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }

  // Get daily summary
  static async getDailySummary(userId, date) {
    let pool;

    try {
      pool = getPool();
      const result = await pool.query(
        `SELECT
          COALESCE(SUM(fi.calories_per_serving * fl.quantity), 0) as total_calories,
          COALESCE(SUM(fi.protein_grams * fl.quantity), 0) as total_protein,
          COALESCE(SUM(fi.carbs_grams * fl.quantity), 0) as total_carbs,
          COALESCE(SUM(fi.fat_grams * fl.quantity), 0) as total_fat,
          COUNT(fl.id) as total_items
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.user_id = $1 AND fl.date = $2`,
        [userId, date]
      );

      // Ensure we always return an object with default values
      return {
        total_calories: result.rows[0]?.total_calories || 0,
        total_protein: result.rows[0]?.total_protein || 0,
        total_carbs: result.rows[0]?.total_carbs || 0,
        total_fat: result.rows[0]?.total_fat || 0,
        total_items: result.rows[0]?.total_items || 0
      };
    } catch (err) {
      logger.error(`Error getting daily summary: ${err.message}`);
      throw err;
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  }
}

module.exports = FoodLog;
