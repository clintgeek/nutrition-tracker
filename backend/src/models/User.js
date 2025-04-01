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
    this.weight = data.weight;
    this.height = data.height;
    this.age = data.age;
    this.gender = data.gender;
    this.birthdate = data.birthdate;
    this.activity_level = data.activity_level;
    this.weight_goal = data.weight_goal;
    this.profile_picture = data.profile_picture;
    this.email_verified = data.email_verified;
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

  // Update user profile
  static async update(id, userData) {
    const client = await getClient();
    const allowedFields = [
      'name', 'weight', 'height', 'gender', 'birthdate',
      'activity_level', 'weight_goal', 'profile_picture'
    ];

    // Filter out fields that aren't allowed or are undefined
    const validUpdates = Object.keys(userData)
      .filter(key => allowedFields.includes(key) && userData[key] !== undefined)
      .reduce((obj, key) => {
        obj[key] = userData[key];
        return obj;
      }, {});

    if (Object.keys(validUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    try {
      // Build the query dynamically based on fields to update
      const setClause = Object.keys(validUpdates)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      const values = Object.values(validUpdates);
      values.push(id);

      const updateQuery = `
        UPDATE users
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (err) {
      logger.error(`Error updating user: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = User;
