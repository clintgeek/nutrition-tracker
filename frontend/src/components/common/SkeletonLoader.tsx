import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  animated = true,
}) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (animated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => {
        animation.stop();
      };
    }
  }, [animated, opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.disabled,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Row of skeleton loaders
export const SkeletonRow: React.FC<{
  count?: number;
  width?: number | string;
  height?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({ count = 3, width = 80, height = 20, spacing = 8, style }) => {
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={width}
          height={height}
          style={index < count - 1 ? { marginRight: spacing } : undefined}
        />
      ))}
    </View>
  );
};

// Card skeleton with title and content
export const SkeletonCard: React.FC<{
  style?: ViewStyle;
}> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width="60%" height={24} style={styles.cardTitle} />
      <SkeletonLoader width="100%" height={16} style={styles.cardItem} />
      <SkeletonLoader width="90%" height={16} style={styles.cardItem} />
      <SkeletonLoader width="80%" height={16} style={styles.cardItem} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginVertical: 8,
  },
  cardTitle: {
    marginBottom: 16,
  },
  cardItem: {
    marginBottom: 8,
  },
});