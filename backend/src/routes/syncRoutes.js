const express = require('express');
const { check } = require('express-validator');
const { getSyncStatus, syncData } = require('../controllers/syncController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/sync/status
 * @desc Get sync status
 * @access Private
 */
router.get('/status', getSyncStatus);

/**
 * @route POST /api/sync
 * @desc Synchronize data
 * @access Private
 */
router.post(
  '/',
  [
    check('device_id', 'Device ID is required').not().isEmpty(),
    check('changes', 'Changes must be an object').isObject(),
  ],
  syncData
);

module.exports = router;