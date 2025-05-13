import { useState, useEffect } from 'react';
import offlineStorage from '../utils/offlineStorage';

const useConflictResolution = () => {
  const [hasConflicts, setHasConflicts] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const checkConflicts = async () => {
    const conflicts = await offlineStorage.getConflicts();
    setHasConflicts(conflicts.length > 0);
  };

  // Check for conflicts when online status changes
  useEffect(() => {
    const handleOnline = () => {
      checkConflicts();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Check for conflicts periodically
  useEffect(() => {
    const interval = setInterval(checkConflicts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const showConflictModal = () => {
    setIsModalVisible(true);
  };

  const hideConflictModal = () => {
    setIsModalVisible(false);
    checkConflicts(); // Recheck conflicts after modal is closed
  };

  return {
    hasConflicts,
    isModalVisible,
    showConflictModal,
    hideConflictModal
  };
};

export default useConflictResolution;