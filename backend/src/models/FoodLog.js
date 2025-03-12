const { getClient } = require('../config/db');
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
    this.serving_size = data.serving_size;
    this.serving_unit = data.serving_unit;
  }

  // Get logs for a specific date
  static async getByDate(userId, date) {
    const client = await getClient();

    try {
      logger.info(`Getting logs for user ${userId} on date ${date}`);

      // Validate userId
      if (!userId) {
        logger.error('getByDate called with missing or invalid userId');
        throw new Error('User ID is required');
      }

      const result = await client.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams,
          fi.carbs_grams, fi.fat_grams, fi.serving_size, fi.serving_unit
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.user_id = $1 AND fl.log_date = $2
        ORDER BY fl.created_at DESC`,
        [userId, date]
      );

      logger.debug(`Found ${result.rows.length} logs for user ${userId}`);
      if (result.rows.length > 0) {
        logger.debug(`Sample log data for user ${userId}: ${JSON.stringify(result.rows[0])}`);
      } else {
        logger.debug(`No logs found for user ${userId} on date ${date}`);
      }

      // Log the full SQL query with parameters for debugging
      logger.debug('SQL Query:', {
        text: result.command,
        values: [userId, date],
        rowCount: result.rowCount
      });

      const logs = result.rows.map(row => {
        const log = new FoodLog(row);
        logger.debug(`Mapped log data for user ${userId}: ${JSON.stringify(log)}`);
        return log;
      });

      return logs;
    } catch (err) {
      logger.error(`Error getting logs by date: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Get logs for a date range
  static async getByDateRange(userId, startDate, endDate) {
    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams,
          fi.carbs_grams, fi.fat_grams, fi.serving_size, fi.serving_unit
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
      client.release();
    }
  }

  // Create a new log
  static async create(logData) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
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
      const logResult = await client.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams,
          fi.carbs_grams, fi.fat_grams, fi.serving_size, fi.serving_unit
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.id = $1`,
        [logId]
      );

      await client.query('COMMIT');
      return new FoodLog(logResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Error creating log: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Update a log
  static async update(id, userId, logData) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
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
        await client.query('ROLLBACK');
        return null;
      }

      // Get the full log with food item details
      const logResult = await client.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams,
          fi.carbs_grams, fi.fat_grams, fi.serving_size, fi.serving_unit
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.id = $1`,
        [id]
      );

      await client.query('COMMIT');
      return new FoodLog(logResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Error updating log: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Delete a log
  static async delete(id, userId) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        'DELETE FROM food_logs WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, userId]
      );

      await client.query('COMMIT');
      return result.rows.length > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Error deleting log: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Get daily summary
  static async getDailySummary(userId, date) {
    const client = await getClient();

    try {
      logger.info(`Getting daily summary for user ${userId} on date ${date}`);

      // Validate inputs
      if (!userId) {
        logger.error('getDailySummary called with missing userId');
        throw new Error('User ID is required');
      }

      if (!date) {
        logger.error('getDailySummary called with missing date');
        throw new Error('Date is required');
      }

      const result = await client.query(
        `SELECT
          COALESCE(SUM(fi.calories_per_serving * fl.servings), 0) as total_calories,
          COALESCE(SUM(fi.protein_grams * fl.servings), 0) as total_protein,
          COALESCE(SUM(fi.carbs_grams * fl.servings), 0) as total_carbs,
          COALESCE(SUM(fi.fat_grams * fl.servings), 0) as total_fat,
          COUNT(fl.id) as total_items
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.user_id = $1 AND fl.log_date = $2`,
        [userId, date]
      );

      logger.info(`Daily summary query completed for user ${userId} on date ${date}`);

      // Log the result for debugging
      logger.debug(`Daily summary result: ${JSON.stringify(result.rows[0])}`);

      // Ensure we always return an object with default values
      return {
        total_calories: result.rows[0]?.total_calories || 0,
        total_protein: result.rows[0]?.total_protein || 0,
        total_carbs: result.rows[0]?.total_carbs || 0,
        total_fat: result.rows[0]?.total_fat || 0,
        total_items: result.rows[0]?.total_items || 0
      };
    } catch (err) {
      logger.error(`Error getting daily summary: ${err.message}`, {
        userId,
        date,
        stack: err.stack
      });
      throw err;
    } finally {
      client.release();
    }
  }

  // Find a log by ID
  static async findById(id, userId) {
    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT
          fl.id, fl.user_id, fl.food_item_id, fl.log_date, fl.meal_type, fl.servings,
          fi.name as food_name, fi.calories_per_serving, fi.protein_grams,
          fi.carbs_grams, fi.fat_grams, fi.serving_size, fi.serving_unit
        FROM food_logs fl
        JOIN food_items fi ON fl.food_item_id = fi.id
        WHERE fl.id = $1 AND fl.user_id = $2`,
        [id, userId]
      );

      return result.rows.length > 0 ? new FoodLog(result.rows[0]) : null;
    } catch (err) {
      logger.error(`Error finding log by id: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = FoodLog;
