const db = require('../config/db');

class UserPreferences {
  static async getHomeScreenLayout(userId) {
    const query = `
      SELECT home_screen_layout
      FROM user_preferences
      WHERE user_id = $1
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0]?.home_screen_layout || [];
  }

  static async updateHomeScreenLayout(userId, layout) {
    try {
      // Convert layout to JSONB if it's not already
      const layoutJson = Array.isArray(layout) ? JSON.stringify(layout) : layout;

      const query = `
        INSERT INTO user_preferences (user_id, home_screen_layout)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (user_id)
        DO UPDATE SET
          home_screen_layout = $2::jsonb,
          updated_at = CURRENT_TIMESTAMP
        RETURNING home_screen_layout
      `;
      const result = await db.query(query, [userId, layoutJson]);
      return result.rows[0].home_screen_layout;
    } catch (error) {
      console.error('Error in updateHomeScreenLayout:', error);
      throw error;
    }
  }
}

module.exports = UserPreferences;