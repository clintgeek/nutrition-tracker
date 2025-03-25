const UserPreferences = require('../models/UserPreferences');

const getHomeScreenLayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const layout = await UserPreferences.getHomeScreenLayout(userId);
    res.json(layout);
  } catch (error) {
    console.error('Error getting home screen layout:', error);
    res.status(500).json({ error: 'Failed to get home screen layout' });
  }
};

const updateHomeScreenLayout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { layout } = req.body;

    if (!Array.isArray(layout)) {
      return res.status(400).json({ error: 'Layout must be an array' });
    }

    const result = await UserPreferences.updateHomeScreenLayout(userId, layout);
    res.json(result);
  } catch (error) {
    console.error('Error updating home screen layout:', error);
    res.status(500).json({ error: 'Failed to update home screen layout' });
  }
};

module.exports = {
  getHomeScreenLayout,
  updateHomeScreenLayout,
};