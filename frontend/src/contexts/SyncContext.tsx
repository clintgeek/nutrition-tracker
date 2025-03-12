import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import uuid from 'react-native-uuid';
import { useAuth } from './AuthContext';
import { syncService } from '../services/syncService';
import { foodLogService } from '../services/foodLogService';
import { goalService } from '../services/goalService';

// Define the shape of the sync context
interface SyncContextData {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  pendingChanges: number;
  syncNow: () => Promise<void>;
  clearSyncError: () => void;
  getDeviceId: () => Promise<string>;
}

// Create the sync context with a default value
const SyncContext = createContext<SyncContextData>({
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  pendingChanges: 0,
  syncNow: async () => {},
  clearSyncError: () => {},
  getDeviceId: async () => '',
});

// Storage keys
const DEVICE_ID_KEY = '@NutritionTracker:deviceId';
const LAST_SYNC_TIME_KEY = '@NutritionTracker:lastSyncTime';
const LAST_SYNC_ERROR_TIME_KEY = '@NutritionTracker:lastSyncErrorTime';

// Error cooldown period in milliseconds (5 minutes)
const ERROR_COOLDOWN_PERIOD = 5 * 60 * 1000;

// Sync provider component
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [lastSyncErrorTime, setLastSyncErrorTime] = useState<number | null>(null);
  const syncInProgressRef = useRef(false);

  // Load device ID and last sync time from storage on app start
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Load device ID
        let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!storedDeviceId) {
          // Generate a new device ID if not found
          storedDeviceId = uuid.v4() as string;
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        }

        setDeviceId(storedDeviceId);

        // Load last sync time
        const storedLastSyncTime = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
        if (storedLastSyncTime) {
          setLastSyncTime(storedLastSyncTime);
        }

        // Load last sync error time
        const storedLastSyncErrorTime = await AsyncStorage.getItem(LAST_SYNC_ERROR_TIME_KEY);
        if (storedLastSyncErrorTime) {
          setLastSyncErrorTime(parseInt(storedLastSyncErrorTime, 10));
        }
      } catch (error) {
        console.error('Error loading sync data from storage:', error);
      }
    };

    loadStoredData();
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor pending changes
  useEffect(() => {
    const checkPendingChanges = async () => {
      if (!user) return;

      try {
        // Get pending food logs
        const pendingFoodLogs = await foodLogService.getPendingChanges();

        // Get pending goals
        const pendingGoals = await goalService.getPendingChanges();

        // Update pending changes count
        setPendingChanges(pendingFoodLogs.length + pendingGoals.length);
      } catch (error) {
        console.error('Error checking pending changes:', error);
      }
    };

    checkPendingChanges();

    // Set up interval to check for pending changes
    const interval = setInterval(checkPendingChanges, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  // Auto-sync when online and there are pending changes
  useEffect(() => {
    // Check if we should sync
    const shouldSync = () => {
      // Don't sync if not online, no user, no pending changes, or already syncing
      if (!isOnline || !user || pendingChanges === 0 || isSyncing || syncInProgressRef.current) {
        return false;
      }

      // Don't sync if we had an error recently
      if (lastSyncErrorTime) {
        const now = Date.now();
        const timeSinceLastError = now - lastSyncErrorTime;

        if (timeSinceLastError < ERROR_COOLDOWN_PERIOD) {
          console.log(`Skipping auto-sync due to recent error (${Math.round(timeSinceLastError / 1000)}s ago)`);
          return false;
        }
      }

      return true;
    };

    if (shouldSync()) {
      syncNow();
    }
  }, [isOnline, pendingChanges, user, isSyncing, lastSyncErrorTime]);

  // Get device ID function
  const getDeviceId = async (): Promise<string> => {
    if (deviceId) return deviceId;

    try {
      // Try to load from storage
      let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

      if (!storedDeviceId) {
        // Generate a new device ID if not found
        storedDeviceId = uuid.v4() as string;
        await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
      }

      setDeviceId(storedDeviceId);
      return storedDeviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Fallback to a temporary device ID
      return uuid.v4() as string;
    }
  };

  // Sync now function
  const syncNow = async () => {
    if (!user || !token || !deviceId || isSyncing || syncInProgressRef.current) return;

    // Set sync in progress flag
    syncInProgressRef.current = true;

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Get pending food logs
      const pendingFoodLogs = await foodLogService.getPendingChanges();

      // Get pending goals
      const pendingGoals = await goalService.getPendingChanges();

      // If no pending changes, just update the last sync time
      if (pendingFoodLogs.length === 0 && pendingGoals.length === 0) {
        console.log('No pending changes to sync');
        setIsSyncing(false);
        syncInProgressRef.current = false;
        return;
      }

      // Prepare changes object
      const changes = {
        food_logs: pendingFoodLogs,
        goals: pendingGoals,
      };

      // Sync with server
      const result = await syncService.syncData(deviceId, lastSyncTime, changes);

      // Process server changes
      if (result.server_changes) {
        // Process food log changes
        if (result.server_changes.food_logs && result.server_changes.food_logs.length > 0) {
          await foodLogService.processSyncedLogs(result.server_changes.food_logs);
        }

        // Process goal changes
        if (result.server_changes.goals && result.server_changes.goals.length > 0) {
          await goalService.processSyncedGoals(result.server_changes.goals);
        }
      }

      // Mark synced items as synced
      if (result.processed_changes) {
        // Mark food logs as synced
        if (result.processed_changes.food_logs) {
          const { created, updated, deleted } = result.processed_changes.food_logs;
          await foodLogService.markAsSynced([...created, ...updated], deleted);
        }

        // Mark goals as synced
        if (result.processed_changes.goals) {
          const { created, updated, deleted } = result.processed_changes.goals;
          await goalService.markAsSynced([...created, ...updated], deleted);
        }
      }

      // Update last sync time
      setLastSyncTime(result.sync_timestamp);
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, result.sync_timestamp);

      // Clear last sync error time
      setLastSyncErrorTime(null);
      await AsyncStorage.removeItem(LAST_SYNC_ERROR_TIME_KEY);

      // Update pending changes count
      setPendingChanges(0);
    } catch (error: any) {
      console.error('Sync error:', error);

      // Set sync error
      setSyncError(error.message || 'Failed to synchronize data');

      // Record the error time
      const now = Date.now();
      setLastSyncErrorTime(now);
      await AsyncStorage.setItem(LAST_SYNC_ERROR_TIME_KEY, now.toString());
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  };

  // Clear sync error function
  const clearSyncError = () => {
    setSyncError(null);
    setLastSyncErrorTime(null);
    AsyncStorage.removeItem(LAST_SYNC_ERROR_TIME_KEY);
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncTime,
        syncError,
        pendingChanges,
        syncNow,
        clearSyncError,
        getDeviceId,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

// Custom hook to use the sync context
export const useSync = () => {
  const context = useContext(SyncContext);

  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }

  return context;
};