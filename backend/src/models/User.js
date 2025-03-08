const db = require('../config/db');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

/**
 * User model for database operations
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    try {
      const { name, email, password } = userData;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Insert user into database
      const result = await db.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, created_at`,
        [name, email, password_hash]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  static async findByEmail(email) {
    try {
      const result = await db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user
   */
  static async update(id, userData) {
    try {
      const { name } = userData;

      const result = await db.query(
        `UPDATE users
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, email, created_at, updated_at`,
        [name, id]
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {number} id - User ID
   * @param {string} password - New password
   * @returns {Promise<boolean>} Success status
   */
  static async updatePassword(id, password) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const result = await db.query(
        `UPDATE users
         SET password_hash = $1, updated_at = NOW()
         WHERE id = $2`,
        [password_hash, id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error updating user password: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare password with stored hash
   * @param {string} password - Password to compare
   * @param {string} hash - Stored password hash
   * @returns {Promise<boolean>} Match status
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = User;