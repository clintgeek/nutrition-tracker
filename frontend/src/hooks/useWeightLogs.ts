import { useState, useEffect } from 'react';
import { weightService, WeightLog } from '../services/weightService';

export const useWeightLogs = () => {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeightLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const logs = await weightService.getWeightLogs();
      setWeightLogs(logs);
    } catch (err) {
      console.error('Error fetching weight logs:', err);
      setError('Failed to fetch weight logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeightLogs();
  }, []);

  return {
    weightLogs,
    isLoading,
    error,
    refetch: fetchWeightLogs
  };
};