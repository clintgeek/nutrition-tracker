import { useState, useEffect } from 'react';
import bloodPressureService, { BloodPressureLog } from '../services/bloodPressureService';

export function useBloodPressureLogs() {
  const [logs, setLogs] = useState<BloodPressureLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await bloodPressureService.getBloodPressureLogs();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blood pressure logs'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const addLog = async (log: Omit<BloodPressureLog, '_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newLog = await bloodPressureService.addBloodPressureLog(log);
      setLogs(prevLogs => [newLog, ...prevLogs]);
      return newLog;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add blood pressure log'));
      throw err;
    }
  };

  const updateLog = async (id: string, log: Partial<BloodPressureLog>) => {
    try {
      const updatedLog = await bloodPressureService.updateBloodPressureLog(id, log);
      setLogs(prevLogs => prevLogs.map(l => l._id === id ? updatedLog : l));
      return updatedLog;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update blood pressure log'));
      throw err;
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await bloodPressureService.deleteBloodPressureLog(id);
      setLogs(prevLogs => prevLogs.filter(l => l._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete blood pressure log'));
      throw err;
    }
  };

  return {
    logs,
    isLoading,
    error,
    addLog,
    updateLog,
    deleteLog,
    refetch: fetchLogs
  };
}