const { getClient } = require('../config/db');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class MealPlan {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.date = data.date;
    this.meal_type = data.meal_type;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.sync_id = data.sync_id;
    this.is_deleted = data.is_deleted;
  }

  static async create(data) {
    const client = await getClient();

    try {
      const result = await client.query(
        `INSERT INTO meal_plans
         (user_id, name, date, meal_type, sync_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          data.user_id,
          data.name,
          data.date,
          data.meal_type,
          data.sync_id || uuidv4()
        ]
      );

      return new MealPlan(result.rows[0]);
    } catch (err) {
      logger.error(`Error creating meal plan: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT * FROM meal_plans
         WHERE id = $1 AND is_deleted = false`,
        [id]
      );

      return result.rows.length > 0 ? new MealPlan(result.rows[0]) : null;
    } catch (err) {
      logger.error(`Error finding meal plan: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  static async findByDate(date) {
    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT * FROM meal_plans
         WHERE date = $1 AND is_deleted = false
         ORDER BY meal_type, created_at`,
        [date]
      );

      return result.rows.map(row => new MealPlan(row));
    } catch (err) {
      logger.error(`Error finding meal plans by date: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const client = await getClient();

    try {
      const result = await client.query(
        `UPDATE meal_plans
         SET name = $1, date = $2, meal_type = $3, updated_at = NOW()
         WHERE id = $4 AND is_deleted = false
         RETURNING *`,
        [data.name, data.date, data.meal_type, id]
      );

      return result.rows.length > 0 ? new MealPlan(result.rows[0]) : null;
    } catch (err) {
      logger.error(`Error updating meal plan: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const client = await getClient();

    try {
      const result = await client.query(
        `UPDATE meal_plans
         SET is_deleted = true, updated_at = NOW()
         WHERE id = $1 AND is_deleted = false
         RETURNING id`,
        [id]
      );

      return result.rows.length > 0;
    } catch (err) {
      logger.error(`Error deleting meal plan: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  static async getByDateRange(startDate, endDate) {
    const client = await getClient();

    try {
      const result = await client.query(
        `SELECT * FROM meal_plans
         WHERE date BETWEEN $1 AND $2 AND is_deleted = false
         ORDER BY date, meal_type`,
        [startDate, endDate]
      );

      return result.rows.map(row => new MealPlan(row));
    } catch (err) {
      logger.error(`Error getting meal plans by date range: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = MealPlan;