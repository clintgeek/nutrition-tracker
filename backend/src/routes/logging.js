const express = require('express');
const { z } = require('zod');

const router = express.Router();

const logSchema = z.object({
  level: z.enum(['info', 'error', 'debug']),
  message: z.string(),
  data: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

router.post('/log', async (req, res) => {
  try {
    const log = logSchema.parse(req.body);

    // Add timestamp if not provided
    const timestamp = log.timestamp || new Date().toISOString();

    // Format the log message
    const logMessage = `[${timestamp}] ${log.level.toUpperCase()}: ${log.message}${
      log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : ''
    }`;

    // Log to console
    if (log.level === 'error') {
      console.error(logMessage);
    } else if (log.level === 'debug') {
      console.debug(logMessage);
    } else {
      console.log(logMessage);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    res.status(400).json({ error: 'Invalid log format' });
  }
});

module.exports = router;