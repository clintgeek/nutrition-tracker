import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useConflictResolution from '../hooks/useConflictResolution';
import ConflictResolutionModal from './ConflictResolutionModal';

const ConflictIndicator = () => {
  const { hasConflicts, isModalVisible, showConflictModal, hideConflictModal } = useConflictResolution();

  if (!hasConflicts) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={showConflictModal}
      >
        <View style={styles.badge}>
          <Ionicons name="warning" size={20} color="white" />
        </View>
      </TouchableOpacity>

      <ConflictResolutionModal
        visible={isModalVisible}
        onClose={hideConflictModal}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: 15,
  },
  badge: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ConflictIndicator;