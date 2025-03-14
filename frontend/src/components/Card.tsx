import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard, useTheme } from 'react-native-paper';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const theme = useTheme();

  return (
    <PaperCard
      style={[styles.card, { backgroundColor: theme.colors.surface }, style]}
      onPress={onPress}
    >
      <PaperCard.Content>
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
});