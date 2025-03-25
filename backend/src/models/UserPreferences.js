const db = require('../config/db');

class UserPreferences {
  static async getHomeScreenLayout(userId) {
    const query = `
      SELECT home_screen_layout
      FROM user_preferences
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0]?.home_screen_layout || null;
  }

  static async updateHomeScreenLayout(userId, layout) {
    const query = `
      INSERT INTO user_preferences (user_id, home_screen_layout)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET
        home_screen_layout = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING home_screen_layout
    `;
    const result = await db.query(query, [userId, layout]);
    return result.rows[0];
  }
}

module.exports = UserPreferences;