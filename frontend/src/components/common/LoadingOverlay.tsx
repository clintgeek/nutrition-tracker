import React from 'react';
import { StyleSheet, View, Modal, Text, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from 'react-native-paper';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  dismissable?: boolean;
  onDismiss?: () => void;
  spinnerSize?: 'small' | 'large' | number;
  spinnerColor?: string;
  backdropOpacity?: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  dismissable = false,
  onDismiss,
  spinnerSize = 'large',
  spinnerColor,
  backdropOpacity = 0.5,
}) => {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={dismissable ? onDismiss : undefined}
    >
      <TouchableWithoutFeedback onPress={dismissable ? onDismiss : undefined}>
        <View
          style={[
            styles.container,
            { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }
          ]}
        >
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <LoadingSpinner
                size={spinnerSize}
                color={spinnerColor || theme.colors.primary}
              />
              {message && (
                <Text style={[styles.message, { color: theme.colors.text }]}>
                  {message}
                </Text>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});