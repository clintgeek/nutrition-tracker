import React, { createContext, useState, useEffect, useContext } from 'react';
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

// Sync provider component
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);

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
    if (isOnline && pendingChanges > 0 && user && !isSyncing) {
      syncNow();
    }
  }, [isOnline, pendingChanges, user, isSyncing]);

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
    if (!user || !token || !deviceId || isSyncing) return;

    try {
      setIsSyncing(true);
      setSyncError(null);

      // Get pending food logs
      const pendingFoodLogs = await foodLogService.getPendingChanges();

      // Get pending goals
      const pendingGoals = await goalService.getPendingChanges();

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
          await foodLogService.processSyncedFoodLogs(result.server_changes.food_logs);
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

      // Update pending changes count
      setPendingChanges(0);
    } catch (error: any) {
      setSyncError(error.message || 'Failed to synchronize data');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear sync error function
  const clearSyncError = () => {
    setSyncError(null);
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