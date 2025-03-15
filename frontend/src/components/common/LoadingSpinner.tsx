import React from 'react';
import { ActivityIndicator, StyleSheet, View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';

interface LoadingSpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  message?: string;
  fullScreen?: boolean;
  transparent?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  message,
  fullScreen = false,
  transparent = false,
}) => {
  const theme = useTheme();
  const spinnerColor = color || theme.colors.primary;

  const containerStyle = [
    styles.container,
    fullScreen && styles.fullScreen,
    transparent && styles.transparent,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {message && <Text style={[styles.message, { color: spinnerColor }]}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 999,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
});