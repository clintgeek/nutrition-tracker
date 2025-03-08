import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, useTheme } from 'react-native-paper';
import { PieChart } from 'react-native-chart-kit';
import { Goal } from '../../types/Goal';

interface GoalProgressProps {
  nutritionSummary: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: Goal | null;
}

const GoalProgressCard: React.FC<GoalProgressProps> = ({ nutritionSummary, goals }) => {
  const theme = useTheme();

  if (!goals) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Macronutrient Breakdown</Title>
          <Text>Set your nutrition goals to see your macronutrient breakdown.</Text>
        </Card.Content>
      </Card>
    );
  }

  // Calculate total macros in grams
  const totalMacros = nutritionSummary.protein + nutritionSummary.carbs + nutritionSummary.fat;

  // Calculate percentages
  const proteinPercentage = totalMacros > 0 ? Math.round((nutritionSummary.protein / totalMacros) * 100) : 0;
  const carbsPercentage = totalMacros > 0 ? Math.round((nutritionSummary.carbs / totalMacros) * 100) : 0;
  const fatPercentage = totalMacros > 0 ? Math.round((nutritionSummary.fat / totalMacros) * 100) : 0;

  // Data for pie chart
  const chartData = [
    {
      name: 'Protein',
      population: nutritionSummary.protein,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Carbs',
      population: nutritionSummary.carbs,
      color: '#2196F3',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Fat',
      population: nutritionSummary.fat,
      color: '#FF9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Macronutrient Breakdown</Title>

        {totalMacros > 0 ? (
          <>
            <View style={styles.chartContainer}>
              <PieChart
                data={chartData}
                width={300}
                height={180}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute={false}
              />
            </View>

            <View style={styles.percentagesContainer}>
              <View style={styles.percentageItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.percentageLabel}>Protein</Text>
                <Text style={styles.percentageValue}>{proteinPercentage}%</Text>
              </View>

              <View style={styles.percentageItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.percentageLabel}>Carbs</Text>
                <Text style={styles.percentageValue}>{carbsPercentage}%</Text>
              </View>

              <View style={styles.percentageItem}>
                <View style={[styles.colorIndicator, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.percentageLabel}>Fat</Text>
                <Text style={styles.percentageValue}>{fatPercentage}%</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noDataText}>
            No food logged today. Add food to see your macronutrient breakdown.
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  percentagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  percentageItem: {
    alignItems: 'center',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 4,
  },
  percentageLabel: {
    fontSize: 12,
    color: '#757575',
  },
  percentageValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#757575',
  },
});

export default GoalProgressCard;