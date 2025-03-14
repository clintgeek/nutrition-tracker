import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';

interface ButtonProps {
  onPress: () => void;
  mode?: 'text' | 'outlined' | 'contained';
  children?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  color?: string;
  title?: string;
  type?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  mode = 'contained',
  children,
  style,
  disabled = false,
  loading = false,
  icon,
  color,
  title,
  type = 'primary',
}) => {
  const theme = useTheme();

  const getButtonColor = () => {
    switch (type) {
      case 'secondary':
        return theme.colors.secondary;
      case 'danger':
        return theme.colors.error;
      default:
        return color || theme.colors.primary;
    }
  };

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      style={[styles.button, style]}
      disabled={disabled}
      loading={loading}
      icon={icon}
      buttonColor={getButtonColor()}
      textColor={mode === 'contained' ? theme.colors.surface : undefined}
    >
      {title || children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    marginVertical: 8,
  },
});