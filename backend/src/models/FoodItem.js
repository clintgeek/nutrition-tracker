const db = require('../config/db');
const logger = require('../config/logger');

/**
 * FoodItem model for database operations
 */
class FoodItem {
  /**
   * Transform database fields to frontend fields
   * @param {Object} dbItem - Database food item
   * @returns {Object} Transformed food item
   */
  static transformToFrontend(dbItem) {
    if (!dbItem) {
      return null;
    }

    return {
      id: dbItem.id,
      name: dbItem.name,
      barcode: dbItem.barcode,
      brand: dbItem.brand,
      calories: dbItem.calories_per_serving || 0,
      protein: dbItem.protein_grams || 0,
      carbs: dbItem.carbs_grams || 0,
      fat: dbItem.fat_grams || 0,
      serving_size: dbItem.serving_size,
      serving_unit: dbItem.serving_unit,
      source: dbItem.source,
      source_id: dbItem.source_id,
      user_id: dbItem.user_id,
      created_at: dbItem.created_at,
      updated_at: dbItem.updated_at,
      is_deleted: dbItem.is_deleted || false,
      last_used: dbItem.last_used
    };
  }

  /**
   * Transform frontend fields to database fields
   * @param {Object} frontendItem - Frontend food item
   * @returns {Object} Transformed food item for database
   */
  static transformToDatabase(data) {
    return {
      name: data.name,
      barcode: data.barcode,
      calories_per_serving: Math.round(data.calories || data.calories_per_serving || 0),
      protein_grams: Math.round(data.protein || data.protein_grams || 0),
      carbs_grams: Math.round(data.carbs || data.carbs_grams || 0),
      fat_grams: Math.round(data.fat || data.fat_grams || 0),
      serving_size: Math.round(data.serving_size || 100),
      serving_unit: data.serving_unit || 'g',
      source: data.source || 'custom',
      source_id: data.source_id || `custom-${Date.now()}`,
      user_id: data.user_id,
      brand: data.brand
    };
  }

  /**
   * Create a new food item
   * @param {Object} foodData - Food item data
   * @returns {Promise<Object>} Created food item
   */
  static async create(foodData) {
    try {
      const dbData = this.transformToDatabase(foodData);
      const result = await db.query(
        `INSERT INTO food_items
         (name, barcode, calories_per_serving, protein_grams, carbs_grams,
          fat_grams, serving_size, serving_unit, source, source_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          dbData.name,
          dbData.barcode,
          dbData.calories_per_serving,
          dbData.protein_grams,
          dbData.carbs_grams,
          dbData.fat_grams,
          dbData.serving_size,
          dbData.serving_unit,
          dbData.source,
          dbData.source_id,
          dbData.user_id,
        ]
      );

      return this.transformToFrontend(result.rows[0]);
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
      logger.debug(`Finding food item by ID: ${id}`);

      if (!id) {
        logger.debug('No ID provided to findById');
        return null;
      }

      const result = await db.query(
        'SELECT * FROM food_items WHERE id = $1',  // Removed is_deleted check to find item even if deleted
        [id]
      );

      if (!result.rows[0]) {
        logger.debug(`No food item found with ID: ${id}`);
        return null;
      }

      logger.debug(`Found food item: ${JSON.stringify(result.rows[0])}`);
      return this.transformToFrontend(result.rows[0]);
    } catch (error) {
      logger.error(`Error finding food item by ID ${id}:`, error);
      logger.error('Stack trace:', error.stack);
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
        'SELECT * FROM food_items WHERE barcode = $1 AND is_deleted = FALSE',
        [barcode]
      );

      return this.transformToFrontend(result.rows[0]);
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
        'SELECT * FROM food_items WHERE source = $1 AND source_id = $2 AND is_deleted = FALSE',
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
        `SELECT *
         FROM food_items
         WHERE similarity(lower(name), lower($1)) > 0.1
         AND is_deleted = FALSE
         ORDER BY similarity(lower(name), lower($1)) DESC
         LIMIT $2 OFFSET $3`,
        [query, limit, offset]
      );

      return result.rows.map(row => this.transformToFrontend(row));
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
  static async update(id, foodData, userId) {
    try {
      // Check if this is a soft delete request
      if (foodData.hasOwnProperty('is_deleted') && Object.keys(foodData).length === 1) {
        // Ensure is_deleted is a boolean
        const isDeleted = foodData.is_deleted === true || foodData.is_deleted === 'true';
        logger.debug(`Soft delete request - ID: ${id}, UserID: ${userId}, Value: ${isDeleted}`);

        const result = await db.query(
          'UPDATE food_items SET is_deleted = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
          [isDeleted, id, userId]
        );

        if (!result.rows[0]) {
          logger.debug(`No rows updated for ID: ${id}, UserID: ${userId}`);
          return null;
        }

        logger.debug(`Successfully updated food item: ${JSON.stringify(result.rows[0])}`);
        return this.transformToFrontend(result.rows[0]);
      }

      // Regular update - transform the data first
      const dbData = this.transformToDatabase(foodData);

      // Log the transformed data for debugging
      logger.debug('Update data after transformation:', dbData);

      const setClause = Object.keys(dbData)
        .filter(key => dbData[key] !== undefined)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      if (!setClause) {
        throw new Error('No valid fields to update');
      }

      const values = Object.keys(dbData)
        .filter(key => dbData[key] !== undefined)
        .map(key => dbData[key]);

      values.push(id);
      values.push(userId);

      logger.debug(`Update query values: ${JSON.stringify(values)}`);

      const result = await db.query(
        `UPDATE food_items
         SET ${setClause}, updated_at = NOW()
         WHERE id = $${values.length - 1} AND user_id = $${values.length}
         RETURNING *`,
        values
      );

      if (!result.rows[0]) {
        logger.debug(`No rows updated for regular update - ID: ${id}, UserID: ${userId}`);
        return null;
      }

      logger.debug(`Successfully updated food item: ${JSON.stringify(result.rows[0])}`);
      return this.transformToFrontend(result.rows[0]);
    } catch (error) {
      logger.error(`Error updating food item (ID: ${id}):`, error);
      logger.error('Stack trace:', error.stack);
      throw error;
    }
  }

  /**
   * Check if food item has any associated logs
   * @param {number} id - Food item ID
   * @returns {Promise<boolean>} True if food logs exist
   */
  static async hasAssociatedLogs(id) {
    try {
      const result = await db.query(
        'SELECT EXISTS(SELECT 1 FROM food_logs WHERE food_item_id = $1)',
        [id]
      );
      return result.rows[0].exists;
    } catch (error) {
      logger.error(`Error checking for associated logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete food item
   * @param {number} id - Food item ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(id, userId) {
    try {
      logger.debug(`Attempting to soft delete food item - ID: ${id}, UserID: ${userId}`);

      const result = await db.query(
        `UPDATE food_items
         SET is_deleted = TRUE, updated_at = NOW()
         WHERE id = $1 AND user_id = $2 AND source = 'custom'
         RETURNING *`,
        [id, userId]
      );

      if (!result.rows[0]) {
        logger.debug(`No rows updated for soft delete - ID: ${id}, UserID: ${userId}`);
        return false;
      }

      logger.debug(`Successfully soft deleted food item ${id}`);
      return true;
    } catch (error) {
      logger.error(`Error soft deleting food item (ID: ${id}):`, error);
      logger.error('Stack trace:', error.stack);
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
        `SELECT *
         FROM food_items
         WHERE source = 'custom'
         AND is_deleted = FALSE
         ORDER BY name ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => this.transformToFrontend(row));
    } catch (error) {
      logger.error(`Error getting custom foods: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FoodItem;