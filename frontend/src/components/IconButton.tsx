import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface IconButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  color,
  size = 24,
  style,
  disabled = false,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  return (
    <MaterialCommunityIcons.Button
      name={icon}
      onPress={onPress}
      size={size}
      color={color || theme.colors.primary}
      style={[styles.button, style]}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      backgroundColor="transparent"
    />
  );
};

const styles = StyleSheet.create({
  button: {
    margin: 0,
    padding: 0,
  },
});

export { IconButton };