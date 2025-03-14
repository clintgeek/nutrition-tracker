import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface IconButtonProps {
  name: string;
  size?: number;
  color?: string;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 24,
  color = '#000000',
  onPress,
  style,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon name={name} size={size} color={disabled ? '#CCCCCC' : color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
  },
});