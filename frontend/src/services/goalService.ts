import { apiService } from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

// Goal interface
export interface Goal {
  id?: number;
  daily_calorie_target: number;
  protein_target_grams?: number;
  carbs_target_grams?: number;
  fat_target_grams?: number;
  start_date?: string;
  sync_id: string;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Storage keys
const PENDING_GOALS_KEY = '@NutritionTracker:pendingGoals';
const OFFLINE_GOALS_KEY = '@NutritionTracker:offlineGoals';

// Export individual functions for direct imports
export const getFoodLogsByDate = async (date: string): Promise<Goal[]> => {
  return goalService.getLogs(date);
};

export const deleteFoodLog = async (id: number): Promise<void> => {
  return goalService.deleteLog(id);
};

// Goal service
export const goalService = {
  // Get current goal
  getCurrentGoal: async (): Promise<Goal | null> => {
    try {
      // Try to get current goal from API
      return apiService.get<{ goal: Goal }>('/goals/current').then((response) => response.goal);
    } catch (error) {
      // If API call fails, get goal from offline storage
      return goalService.getOfflineCurrentGoal();
    }
  },

  // Get goal for a specific date
  getForDate: async (date: string): Promise<Goal | null> => {
    try {
      // Try to get goal from API
      return apiService.get<{ goal: Goal }>(`/goals/date?date=${date}`).then((response) => response.goal);
    } catch (error) {
      // If API call fails, get goal from offline storage
      return goalService.getOfflineGoalForDate(date);
    }
  },

  // Get all goals
  getAll: async (): Promise<Goal[]> => {
    try {
      // Try to get goals from API
      return apiService.get<{ goals: Goal[] }>('/goals').then((response) => response.goals);
    } catch (error) {
      // If API call fails, get goals from offline storage
      return goalService.getOfflineGoals();
    }
  },

  // Create a new goal
  createGoal: async (goalData: Omit<Goal, 'id' | 'sync_id' | 'created_at' | 'updated_at'>): Promise<Goal> => {
    // Generate sync ID
    const syncId = uuid.v4() as string;

    try {
      // Try to create goal via API
      const goal = await apiService.post<{ message: string; goal: Goal }>('/goals', {
        ...goalData,
        sync_id: syncId,
      }).then((response) => response.goal);

      return goal;
    } catch (error) {
      // If API call fails, save goal offline
      const offlineGoal: Goal = {
        ...goalData,
        sync_id: syncId,
        is_deleted: false,
      };

      await goalService.saveOfflineGoal(offlineGoal);

      return offlineGoal;
    }
  },

  // Update a goal
  updateGoal: async (id: number, goalData: Partial<Goal>): Promise<Goal> => {
    try {
      // Try to update goal via API
      return apiService.put<{ message: string; goal: Goal }>(`/goals/${id}`, goalData).then((response) => response.goal);
    } catch (error) {
      // If API call fails, mark goal for update
      await goalService.markGoalForUpdate(id, goalData);

      // Return updated goal
      return { ...goalData, id } as Goal;
    }
  },

  // Delete a goal
  deleteGoal: async (id: number): Promise<void> => {
    try {
      // Try to delete goal via API
      await apiService.delete<{ message: string }>(`/goals/${id}`);
    } catch (error) {
      // If API call fails, mark goal for deletion
      await goalService.markGoalForDeletion(id);
    }
  },

  // Get offline goals
  getOfflineGoals: async (): Promise<Goal[]> => {
    try {
      // Get offline goals from storage
      const offlineGoalsJson = await AsyncStorage.getItem(OFFLINE_GOALS_KEY);

      if (!offlineGoalsJson) {
        return [];
      }

      const offlineGoals: Goal[] = JSON.parse(offlineGoalsJson);

      // Filter out deleted goals
      return offlineGoals.filter((goal) => !goal.is_deleted);
    } catch (error) {
      console.error('Error getting offline goals:', error);
      return [];
    }
  },

  // Get offline current goal
  getOfflineCurrentGoal: async (): Promise<Goal | null> => {
    try {
      // Get offline goals
      const offlineGoals = await goalService.getOfflineGoals();

      if (offlineGoals.length === 0) {
        return null;
      }

      // Get current date
      const currentDate = new Date().toISOString().split('T')[0];

      // Find goal that applies to current date
      const currentGoal = offlineGoals.find((goal) => {
        const startDate = goal.start_date ? goal.start_date : '0000-00-00';
        return startDate <= currentDate;
      });

      // If no goal applies to current date, return most recent goal
      if (!currentGoal) {
        return offlineGoals.sort((a, b) => {
          const aDate = a.created_at || '0000-00-00';
          const bDate = b.created_at || '0000-00-00';

          return bDate.localeCompare(aDate);
        })[0];
      }

      return currentGoal;
    } catch (error) {
      console.error('Error getting offline current goal:', error);
      return null;
    }
  },

  // Get offline goal for a specific date
  getOfflineGoalForDate: async (date: string): Promise<Goal | null> => {
    try {
      // Get offline goals
      const offlineGoals = await goalService.getOfflineGoals();

      if (offlineGoals.length === 0) {
        return null;
      }

      // Find goal that applies to the specified date
      const goal = offlineGoals.find((g) => {
        const startDate = g.start_date ? g.start_date : '0000-00-00';
        return startDate <= date;
      });

      // If no goal applies to the specified date, return most recent goal before that date
      if (!goal) {
        const goalsBeforeDate = offlineGoals.filter((g) => {
          const startDate = g.start_date ? g.start_date : '0000-00-00';
          return startDate <= date;
        });

        if (goalsBeforeDate.length === 0) {
          return null;
        }

        return goalsBeforeDate.sort((a, b) => {
          const aDate = a.start_date || '0000-00-00';
          const bDate = b.start_date || '0000-00-00';

          return bDate.localeCompare(aDate);
        })[0];
      }

      return goal;
    } catch (error) {
      console.error('Error getting offline goal for date:', error);
      return null;
    }
  },

  // Save offline goal
  saveOfflineGoal: async (goal: Goal): Promise<void> => {
    try {
      // Get existing offline goals
      const offlineGoalsJson = await AsyncStorage.getItem(OFFLINE_GOALS_KEY);
      const offlineGoals: Goal[] = offlineGoalsJson ? JSON.parse(offlineGoalsJson) : [];

      // Add new goal
      offlineGoals.push(goal);

      // Save updated goals
      await AsyncStorage.setItem(OFFLINE_GOALS_KEY, JSON.stringify(offlineGoals));

      // Add to pending changes
      await goalService.addToPendingChanges(goal);
    } catch (error) {
      console.error('Error saving offline goal:', error);
    }
  },

  // Mark goal for update
  markGoalForUpdate: async (id: number, goalData: Partial<Goal>): Promise<void> => {
    try {
      // Get existing offline goals
      const offlineGoalsJson = await AsyncStorage.getItem(OFFLINE_GOALS_KEY);
      const offlineGoals: Goal[] = offlineGoalsJson ? JSON.parse(offlineGoalsJson) : [];

      // Find goal by ID
      const goalIndex = offlineGoals.findIndex((goal) => goal.id === id);

      if (goalIndex !== -1) {
        // Update goal
        offlineGoals[goalIndex] = { ...offlineGoals[goalIndex], ...goalData };

        // Save updated goals
        await AsyncStorage.setItem(OFFLINE_GOALS_KEY, JSON.stringify(offlineGoals));
      }

      // Add to pending changes
      await goalService.addToPendingChanges({ id, ...goalData } as Goal);
    } catch (error) {
      console.error('Error marking goal for update:', error);
    }
  },

  // Mark goal for deletion
  markGoalForDeletion: async (id: number): Promise<void> => {
    try {
      // Get existing offline goals
      const offlineGoalsJson = await AsyncStorage.getItem(OFFLINE_GOALS_KEY);
      const offlineGoals: Goal[] = offlineGoalsJson ? JSON.parse(offlineGoalsJson) : [];

      // Find goal by ID
      const goalIndex = offlineGoals.findIndex((goal) => goal.id === id);

      if (goalIndex !== -1) {
        // Mark goal as deleted
        offlineGoals[goalIndex] = { ...offlineGoals[goalIndex], is_deleted: true };

        // Save updated goals
        await AsyncStorage.setItem(OFFLINE_GOALS_KEY, JSON.stringify(offlineGoals));
      }

      // Add to pending changes
      await goalService.addToPendingChanges({ id, is_deleted: true } as Goal);
    } catch (error) {
      console.error('Error marking goal for deletion:', error);
    }
  },

  // Add goal to pending changes
  addToPendingChanges: async (goal: Goal): Promise<void> => {
    try {
      // Get existing pending changes
      const pendingChangesJson = await AsyncStorage.getItem(PENDING_GOALS_KEY);
      const pendingChanges: Goal[] = pendingChangesJson ? JSON.parse(pendingChangesJson) : [];

      // Add goal to pending changes
      pendingChanges.push(goal);

      // Save updated pending changes
      await AsyncStorage.setItem(PENDING_GOALS_KEY, JSON.stringify(pendingChanges));
    } catch (error) {
      console.error('Error adding goal to pending changes:', error);
    }
  },

  // Get pending changes
  getPendingChanges: async (): Promise<Goal[]> => {
    try {
      // Get pending changes from storage
      const pendingChangesJson = await AsyncStorage.getItem(PENDING_GOALS_KEY);

      if (!pendingChangesJson) {
        return [];
      }

      return JSON.parse(pendingChangesJson);
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  },

  // Process synced goals
  processSyncedGoals: async (goals: Goal[]): Promise<void> => {
    try {
      // Get existing offline goals
      const offlineGoalsJson = await AsyncStorage.getItem(OFFLINE_GOALS_KEY);
      const offlineGoals: Goal[] = offlineGoalsJson ? JSON.parse(offlineGoalsJson) : [];

      // Process each synced goal
      for (const goal of goals) {
        // Find goal by sync ID
        const goalIndex = offlineGoals.findIndex((offlineGoal) => offlineGoal.sync_id === goal.sync_id);

        if (goalIndex !== -1) {
          // Update existing goal
          offlineGoals[goalIndex] = { ...offlineGoals[goalIndex], ...goal };
        } else {
          // Add new goal
          offlineGoals.push(goal);
        }
      }

      // Save updated goals
      await AsyncStorage.setItem(OFFLINE_GOALS_KEY, JSON.stringify(offlineGoals));
    } catch (error) {
      console.error('Error processing synced goals:', error);
    }
  },

  // Mark goals as synced
  markAsSynced: async (syncedGoals: Goal[], deletedIds: number[]): Promise<void> => {
    try {
      // Get pending changes
      const pendingChangesJson = await AsyncStorage.getItem(PENDING_GOALS_KEY);
      let pendingChanges: Goal[] = pendingChangesJson ? JSON.parse(pendingChangesJson) : [];

      // Remove synced goals from pending changes
      pendingChanges = pendingChanges.filter((pendingGoal) => {
        // Check if goal is in synced goals
        const isSynced = syncedGoals.some((syncedGoal) =>
          (syncedGoal.id && syncedGoal.id === pendingGoal.id) ||
          (syncedGoal.sync_id && syncedGoal.sync_id === pendingGoal.sync_id)
        );

        // Check if goal is in deleted IDs
        const isDeleted = pendingGoal.id && deletedIds.includes(pendingGoal.id);

        // Keep goal if not synced and not deleted
        return !isSynced && !isDeleted;
      });

      // Save updated pending changes
      await AsyncStorage.setItem(PENDING_GOALS_KEY, JSON.stringify(pendingChanges));
    } catch (error) {
      console.error('Error marking goals as synced:', error);
    }
  },

  // For compatibility with foodLogService
  getLogs: async (date: string): Promise<Goal[]> => {
    return goalService.getAll();
  },

  // For compatibility with foodLogService
  deleteLog: async (id: number): Promise<void> => {
    return goalService.deleteGoal(id);
  }
};