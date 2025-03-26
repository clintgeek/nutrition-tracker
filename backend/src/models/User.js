const { getClient } = require('../config/db');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password_hash;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { name, email, password } = userData;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert user into database
      const result = await client.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [name, email, hashedPassword]
      );

      await client.query('COMMIT');
      return new User(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error(`Error creating user: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows.length ? new User(result.rows[0]) : null;
    } catch (err) {
      logger.error(`Error finding user by email: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id) {
    const client = await getClient();

    try {
      const result = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows.length ? new User(result.rows[0]) : null;
    } catch (err) {
      logger.error(`Error finding user by ID: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (err) {
      logger.error(`Error verifying password: ${err.message}`);
      throw err;
    }
  }

  // Return user data without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
