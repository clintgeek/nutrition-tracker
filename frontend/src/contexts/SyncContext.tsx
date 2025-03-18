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

// Default context value
const defaultSyncContext: SyncContextData = {
  isOnline: true,
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  pendingChanges: 0,
  syncNow: async () => {},
  clearSyncError: () => {},
  getDeviceId: async () => '',
};

// Create the sync context with a default value
const SyncContext = createContext<SyncContextData>(defaultSyncContext);

// Storage keys
const DEVICE_ID_KEY = '@NutritionTracker:deviceId';
const LAST_SYNC_TIME_KEY = '@NutritionTracker:lastSyncTime';
const LAST_SYNC_ERROR_TIME_KEY = '@NutritionTracker:lastSyncErrorTime';

// Sync provider component
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get auth context
  const auth = useAuth();
  const user = auth.user;
  const token = auth.token;
  const isAuthLoading = auth.loading;

  // State
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Ref for tracking sync status
  const syncInProgressRef = useRef(false);

  // Initialize
  useEffect(() => {
    // Skip if auth is still loading
    if (isAuthLoading) return;

    const initializeSync = async () => {
      try {
        // Load device ID
        let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

        if (!storedDeviceId) {
          storedDeviceId = uuid.v4() as string;
          await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
        }

        setDeviceId(storedDeviceId);

        // Load last sync time
        const storedLastSyncTime = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
        if (storedLastSyncTime) {
          setLastSyncTime(storedLastSyncTime);
        }

        // Set up network monitoring
        NetInfo.addEventListener(state => {
          setIsOnline(state.isConnected ?? false);
        });

        // Mark as ready
        setIsReady(true);
      } catch (error) {
        console.error('Error initializing sync:', error);
        setIsReady(true); // Still mark as ready to avoid blocking the app
      }
    };

    initializeSync();
  }, [isAuthLoading]);

  // Check for pending changes when user changes
  useEffect(() => {
    if (!isReady || !user) return;

    const checkPendingChanges = async () => {
      try {
        const pendingFoodLogs = await foodLogService.getPendingChanges();
        const pendingGoals = await goalService.getPendingChanges();
        setPendingChanges(pendingFoodLogs.length + pendingGoals.length);
      } catch (error) {
        console.error('Error checking pending changes:', error);
      }
    };

    checkPendingChanges();

    const interval = setInterval(checkPendingChanges, 60000);
    return () => clearInterval(interval);
  }, [user, isReady]);

  // Get device ID function
  const getDeviceId = async (): Promise<string> => {
    if (deviceId) return deviceId;

    try {
      let storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

      if (!storedDeviceId) {
        storedDeviceId = uuid.v4() as string;
        await AsyncStorage.setItem(DEVICE_ID_KEY, storedDeviceId);
      }

      setDeviceId(storedDeviceId);
      return storedDeviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return uuid.v4() as string;
    }
  };

  // Sync now function
  const syncNow = async () => {
    if (!user || !token || !deviceId || isSyncing || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    try {
      setIsSyncing(true);
      setSyncError(null);

      // Get pending food logs and goals
      const pendingFoodLogs = await foodLogService.getPendingChanges();
      const pendingGoals = await goalService.getPendingChanges();

      // If no pending changes, exit early
      if (pendingFoodLogs.length === 0 && pendingGoals.length === 0) {
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
        if (result.server_changes.food_logs?.length > 0) {
          await foodLogService.processSyncedLogs(result.server_changes.food_logs);
        }

        if (result.server_changes.goals?.length > 0) {
          await goalService.processSyncedGoals(result.server_changes.goals);
        }
      }

      // Mark synced items as synced
      if (result.processed_changes) {
        if (result.processed_changes.food_logs) {
          const { created, updated, deleted } = result.processed_changes.food_logs;
          await foodLogService.markAsSynced([...created, ...updated], deleted);
        }

        if (result.processed_changes.goals) {
          const { created, updated, deleted } = result.processed_changes.goals;
          await goalService.markAsSynced([...created, ...updated], deleted);
        }
      }

      // Update last sync time
      setLastSyncTime(result.sync_timestamp);
      await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, result.sync_timestamp);

      // Clear sync error state
      setSyncError(null);
      await AsyncStorage.removeItem(LAST_SYNC_ERROR_TIME_KEY);

      // Update pending changes count
      setPendingChanges(0);
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Failed to synchronize data');
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  };

  // Clear sync error function
  const clearSyncError = () => {
    setSyncError(null);
    AsyncStorage.removeItem(LAST_SYNC_ERROR_TIME_KEY);
  };

  // Create context value
  const contextValue: SyncContextData = {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncError,
    pendingChanges,
    syncNow,
    clearSyncError,
    getDeviceId,
  };

  // If auth is loading or this context isn't ready yet, render a placeholder
  if (isAuthLoading || !isReady) {
    return (
      <SyncContext.Provider value={defaultSyncContext}>
        {null}
      </SyncContext.Provider>
    );
  }

  // Render children when ready
  return (
    <SyncContext.Provider value={contextValue}>
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