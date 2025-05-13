import { openDB } from 'idb';
import { subDays, isAfter, isBefore, parseISO } from 'date-fns';

const DB_NAME = 'fitnessgeek-offline';
const DB_VERSION = 1;

// Define store names
const STORES = {
  FOOD_LOGS: 'foodLogs',
  MEALS: 'meals',
  WEIGHT_LOGS: 'weightLogs',
  BP_LOGS: 'bpLogs',
  SYNC_QUEUE: 'syncQueue'
};

// Initialize the database
const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores
      if (!db.objectStoreNames.contains(STORES.FOOD_LOGS)) {
        db.createObjectStore(STORES.FOOD_LOGS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.MEALS)) {
        db.createObjectStore(STORES.MEALS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.WEIGHT_LOGS)) {
        db.createObjectStore(STORES.WEIGHT_LOGS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.BP_LOGS)) {
        db.createObjectStore(STORES.BP_LOGS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return db;
};

// Add item to sync queue with conflict resolution data
const addToSyncQueue = async (action, data, localTimestamp) => {
  const db = await initDB();
  await db.add(STORES.SYNC_QUEUE, {
    action,
    data,
    localTimestamp,
    serverTimestamp: null,
    status: 'pending',
    conflict: false
  });
};

// Process sync queue with conflict resolution
const processSyncQueue = async () => {
  const db = await initDB();
  const queue = await db.getAll(STORES.SYNC_QUEUE);

  for (const item of queue) {
    if (item.status === 'pending') {
      try {
        // First, check if there's a conflict by getting the latest server data
        const checkResponse = await fetch(`${window.API_CONFIG.baseURL}/${item.action}/latest`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (checkResponse.ok) {
          const serverData = await checkResponse.json();

          // Check for conflicts (if server has newer data for the same date)
          if (serverData && serverData.timestamp) {
            const serverTime = parseISO(serverData.timestamp);
            const localTime = parseISO(item.localTimestamp);

            if (isAfter(serverTime, localTime)) {
              // Conflict detected - mark for user resolution
              await db.put(STORES.SYNC_QUEUE, {
                ...item,
                status: 'conflict',
                serverData
              });
              continue;
            }
          }

          // No conflict, proceed with sync
          const response = await fetch(`${window.API_CONFIG.baseURL}/${item.action}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          });

          if (response.ok) {
            const result = await response.json();
            await db.put(STORES.SYNC_QUEUE, {
              ...item,
              status: 'completed',
              serverTimestamp: result.timestamp
            });
          }
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
};

// Offline data storage methods
const offlineStorage = {
  // Weight logs
  async addWeightLog(weightLog) {
    const db = await initDB();
    const timestamp = new Date().toISOString();
    const id = await db.add(STORES.WEIGHT_LOGS, {
      ...weightLog,
      timestamp,
      synced: false
    });
    await addToSyncQueue('weight-logs', weightLog, timestamp);
    return id;
  },

  async getWeightLogs() {
    const db = await initDB();
    return db.getAll(STORES.WEIGHT_LOGS);
  },

  // BP logs
  async addBPLog(bpLog) {
    const db = await initDB();
    const timestamp = new Date().toISOString();
    const id = await db.add(STORES.BP_LOGS, {
      ...bpLog,
      timestamp,
      synced: false
    });
    await addToSyncQueue('bp-logs', bpLog, timestamp);
    return id;
  },

  async getBPLogs() {
    const db = await initDB();
    return db.getAll(STORES.BP_LOGS);
  },

  // Food logs (read-only for now)
  async getFoodLogs(days = 7) {
    const db = await initDB();
    const allLogs = await db.getAll(STORES.FOOD_LOGS);
    const cutoffDate = subDays(new Date(), days);

    return allLogs.filter(log =>
      isAfter(parseISO(log.timestamp), cutoffDate)
    );
  },

  // Conflict resolution
  async resolveConflict(queueItemId, resolution) {
    const db = await initDB();
    const item = await db.get(STORES.SYNC_QUEUE, queueItemId);

    if (item && item.status === 'conflict') {
      if (resolution === 'useLocal') {
        // Retry sync with local data
        await db.put(STORES.SYNC_QUEUE, {
          ...item,
          status: 'pending',
          conflict: false
        });
      } else if (resolution === 'useServer') {
        // Update local data with server data
        const store = item.action === 'weight-logs' ? STORES.WEIGHT_LOGS : STORES.BP_LOGS;
        await db.put(store, {
          ...item.serverData,
          synced: true
        });
        await db.put(STORES.SYNC_QUEUE, {
          ...item,
          status: 'completed',
          serverTimestamp: item.serverData.timestamp
        });
      }
    }
  },

  // Sync management
  async syncData() {
    await processSyncQueue();
  },

  // Get pending conflicts
  async getConflicts() {
    const db = await initDB();
    return db.getAllFromIndex(STORES.SYNC_QUEUE, 'status', 'conflict');
  }
};

// Listen for online status changes
window.addEventListener('online', () => {
  offlineStorage.syncData();
});

export default offlineStorage;