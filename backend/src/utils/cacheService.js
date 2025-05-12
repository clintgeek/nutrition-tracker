const FOOD_CONSTANTS = require('./foodConstants');
const logger = require('./logger');

class Cache {
  constructor(ttl = FOOD_CONSTANTS.CACHE_TTL) {
    this.data = new Map();
    this.timestamps = new Map();
    this.ttl = ttl;
    this.startCleanup();
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp <= this.ttl) {
      return this.data.get(key);
    }
    return null;
  }

  set(key, value) {
    this.data.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  delete(key) {
    this.data.delete(key);
    this.timestamps.delete(key);
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.timestamps.entries()) {
        if (now - timestamp > this.ttl) {
          this.delete(key);
        }
      }
    }, this.ttl);
  }

  clear() {
    this.data.clear();
    this.timestamps.clear();
  }
}

// Export a singleton instance
module.exports = new Cache();