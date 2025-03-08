const db = require('../config/db');
const logger = require('../config/logger');

/**
 * SyncMetadata model for database operations
 */
class SyncMetadata {
  /**
   * Get sync metadata for a user and device
   * @param {number} userId - User ID
   * @param {string} deviceId - Device ID
   * @returns {Promise<Object|null>} Sync metadata or null
   */
  static async get(userId, deviceId) {
    try {
      const result = await db.query(
        'SELECT * FROM sync_metadata WHERE user_id = $1 AND device_id = $2',
        [userId, deviceId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting sync metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or update sync metadata
   * @param {number} userId - User ID
   * @param {string} deviceId - Device ID
   * @param {string} lastSyncTimestamp - Last sync timestamp
   * @returns {Promise<Object>} Created or updated sync metadata
   */
  static async upsert(userId, deviceId, lastSyncTimestamp) {
    try {
      // Check if sync metadata exists
      const existingMetadata = await this.get(userId, deviceId);

      if (existingMetadata) {
        // Update existing metadata
        const result = await db.query(
          `UPDATE sync_metadata
           SET last_sync_timestamp = $1, updated_at = NOW()
           WHERE user_id = $2 AND device_id = $3
           RETURNING *`,
          [lastSyncTimestamp, userId, deviceId]
        );

        return result.rows[0];
      } else {
        // Create new metadata
        const result = await db.query(
          `INSERT INTO sync_metadata
           (user_id, device_id, last_sync_timestamp)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [userId, deviceId, lastSyncTimestamp]
        );

        return result.rows[0];
      }
    } catch (error) {
      logger.error(`Error upserting sync metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all sync metadata for a user
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Sync metadata
   */
  static async getAllForUser(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM sync_metadata WHERE user_id = $1',
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error(`Error getting all sync metadata for user: ${error.message}`);
      throw error;
    }
  }
}

module.exports = SyncMetadata;