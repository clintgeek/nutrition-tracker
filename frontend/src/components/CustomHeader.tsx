import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  leftComponent?: React.ReactNode;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = false,
  leftComponent
}) => {
  const navigation = useNavigation();
  const theme = useTheme();

  const renderTitle = () => {
    if (title === 'FitnessGeek') {
      return (
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="weight-lifter" size={24} color="white" />
          <Text style={styles.title}>FitnessGeek</Text>
          <MaterialCommunityIcons name="code-tags" size={20} color="white" style={{ marginTop: 4 }} />
        </View>
      );
    }
    return <Text style={styles.title}>{title}</Text>;
  };

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.headerContent}>
        {leftComponent ? (
          leftComponent
        ) : showBackButton ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.leftButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleContainer}>
          {renderTitle()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: '100%',
  },
  leftButton: {
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  }
});

export default CustomHeader;