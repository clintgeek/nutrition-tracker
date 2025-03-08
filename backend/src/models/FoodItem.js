const db = require('../config/db');
const logger = require('../config/logger');

/**
 * FoodItem model for database operations
 */
class FoodItem {
  /**
   * Create a new food item
   * @param {Object} foodData - Food item data
   * @returns {Promise<Object>} Created food item
   */
  static async create(foodData) {
    try {
      const {
        name,
        barcode,
        calories_per_serving,
        protein_grams,
        carbs_grams,
        fat_grams,
        serving_size,
        serving_unit,
        source,
        source_id,
      } = foodData;

      const result = await db.query(
        `INSERT INTO food_items
         (name, barcode, calories_per_serving, protein_grams, carbs_grams,
          fat_grams, serving_size, serving_unit, source, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          name,
          barcode,
          calories_per_serving,
          protein_grams,
          carbs_grams,
          fat_grams,
          serving_size,
          serving_unit,
          source,
          source_id,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating food item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find food item by ID
   * @param {number} id - Food item ID
   * @returns {Promise<Object|null>} Food item or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM food_items WHERE id = $1',
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding food item by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find food item by barcode
   * @param {string} barcode - Barcode
   * @returns {Promise<Object|null>} Food item or null
   */
  static async findByBarcode(barcode) {
    try {
      const result = await db.query(
        'SELECT * FROM food_items WHERE barcode = $1',
        [barcode]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding food item by barcode: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find food item by source and source ID
   * @param {string} source - Source (e.g., 'openfoodfacts', 'usda')
   * @param {string} sourceId - Source ID
   * @returns {Promise<Object|null>} Food item or null
   */
  static async findBySourceId(source, sourceId) {
    try {
      const result = await db.query(
        'SELECT * FROM food_items WHERE source = $1 AND source_id = $2',
        [source, sourceId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding food item by source ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search food items by name
   * @param {string} query - Search query
   * @param {number} limit - Result limit
   * @param {number} offset - Result offset
   * @returns {Promise<Array>} Food items
   */
  static async search(query, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT * FROM food_items
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT $2 OFFSET $3`,
        [`%${query}%`, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error searching food items: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update food item
   * @param {number} id - Food item ID
   * @param {Object} foodData - Food item data
   * @returns {Promise<Object|null>} Updated food item or null
   */
  static async update(id, foodData) {
    try {
      const {
        name,
        calories_per_serving,
        protein_grams,
        carbs_grams,
        fat_grams,
        serving_size,
        serving_unit,
      } = foodData;

      const result = await db.query(
        `UPDATE food_items
         SET name = $1,
             calories_per_serving = $2,
             protein_grams = $3,
             carbs_grams = $4,
             fat_grams = $5,
             serving_size = $6,
             serving_unit = $7,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          name,
          calories_per_serving,
          protein_grams,
          carbs_grams,
          fat_grams,
          serving_size,
          serving_unit,
          id,
        ]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating food item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete food item
   * @param {number} id - Food item ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id) {
    try {
      const result = await db.query(
        'DELETE FROM food_items WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting food item: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get custom food items created by a user
   * @param {number} userId - User ID
   * @param {number} limit - Result limit
   * @param {number} offset - Result offset
   * @returns {Promise<Array>} Food items
   */
  static async getCustomFoods(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT fi.*
         FROM food_items fi
         JOIN food_logs fl ON fi.id = fl.food_item_id
         WHERE fl.user_id = $1 AND fi.source = 'custom'
         GROUP BY fi.id
         ORDER BY fi.name ASC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting custom foods: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FoodItem;