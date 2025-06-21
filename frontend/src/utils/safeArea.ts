import React from 'react';
import { Platform } from 'react-native';

// Simple safe area implementation for web PWA
export const useSafeAreaInsets = () => {
  if (Platform.OS === 'web') {
    return {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
  }

  // For native platforms, this would need the actual safe area context
  // For now, return zeros to avoid breaking the app
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
};

// Simple SafeAreaProvider for web
export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};