const db = require('../config/db');
const logger = require('../config/logger');

class BloodPressure {
  /**
   * Format date string to YYYY-MM-DD
   * @param {string} dateStr - Date string
   * @returns {string} Formatted date string
   */
  static formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get blood pressure logs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of blood pressure logs
   */
  static async getBloodPressureLogs(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM blood_pressure_logs
         WHERE user_id = $1
         ORDER BY log_date DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error getting blood pressure logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get blood pressure logs for a date range
   * @param {string} userId - User ID
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of blood pressure logs
   */
  static async getBloodPressureLogsForDateRange(userId, startDate, endDate) {
    try {
      const result = await db.query(
        `SELECT * FROM blood_pressure_logs
         WHERE user_id = $1
         AND log_date BETWEEN $2 AND $3
         ORDER BY log_date DESC`,
        [userId, this.formatDate(startDate), this.formatDate(endDate)]
      );
      return result.rows;
    } catch (error) {
      logger.error(`Error getting blood pressure logs for date range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a blood pressure log
   * @param {Object} logData - Blood pressure log data
   * @returns {Promise<Object>} Created blood pressure log
   */
  static async addBloodPressureLog(logData) {
    const { user_id, systolic, diastolic, pulse, log_date, notes } = logData;

    try {
      const result = await db.query(
        `INSERT INTO blood_pressure_logs
         (user_id, systolic, diastolic, pulse, log_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, systolic, diastolic, pulse, this.formatDate(log_date), notes]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error adding blood pressure log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update a blood pressure log
   * @param {number} id - Log ID
   * @param {string} userId - User ID
   * @param {Object} logData - Updated blood pressure log data
   * @returns {Promise<Object>} Updated blood pressure log
   */
  static async updateBloodPressureLog(id, userId, logData) {
    const { systolic, diastolic, pulse, log_date, notes } = logData;

    try {
      const result = await db.query(
        `UPDATE blood_pressure_logs
         SET systolic = $1,
             diastolic = $2,
             pulse = $3,
             log_date = $4,
             notes = $5
         WHERE id = $6 AND user_id = $7
         RETURNING *`,
        [systolic, diastolic, pulse, this.formatDate(log_date), notes, id, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error updating blood pressure log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a blood pressure log
   * @param {number} id - Log ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async deleteBloodPressureLog(id, userId) {
    try {
      const result = await db.query(
        `DELETE FROM blood_pressure_logs
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting blood pressure log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get latest blood pressure log
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Latest blood pressure log or null if none exists
   */
  static async getLatestBloodPressureLog(userId) {
    try {
      const result = await db.query(
        `SELECT * FROM blood_pressure_logs
         WHERE user_id = $1
         ORDER BY log_date DESC, created_at DESC
         LIMIT 1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting latest blood pressure log: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BloodPressure;