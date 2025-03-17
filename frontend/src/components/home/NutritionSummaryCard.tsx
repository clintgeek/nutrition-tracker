import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title, Text, ProgressBar, useTheme } from 'react-native-paper';
import { Goal } from '../../types/Goal';
import { formatCalories, formatGrams } from '../../utils/formatters';

interface NutritionSummaryProps {
  nutritionSummary: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: Goal | null;
}

const NutritionSummaryCard: React.FC<NutritionSummaryProps> = ({ nutritionSummary, goals }) => {
  const theme = useTheme();

  // Calculate percentages of goals
  const caloriePercentage = goals ? Math.min(nutritionSummary.calories / goals.daily_calorie_target, 1) : 0;
  const proteinPercentage = goals?.protein_target_grams ? Math.min(nutritionSummary.protein / goals.protein_target_grams, 1) : 0;
  const carbsPercentage = goals?.carbs_target_grams ? Math.min(nutritionSummary.carbs / goals.carbs_target_grams, 1) : 0;
  const fatPercentage = goals?.fat_target_grams ? Math.min(nutritionSummary.fat / goals.fat_target_grams, 1) : 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>Today's Nutrition</Title>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>Calories</Text>
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={caloriePercentage}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {formatCalories(nutritionSummary.calories)}
              </Text>
              <Text style={styles.goalValue}>
                / {goals ? formatCalories(goals.daily_calorie_target) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>Protein</Text>
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={proteinPercentage}
              color="#4CAF50"
              style={styles.progressBar}
            />
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {formatGrams(nutritionSummary.protein)}
              </Text>
              <Text style={styles.goalValue}>
                / {goals?.protein_target_grams ? formatGrams(goals.protein_target_grams) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>Carbs</Text>
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={carbsPercentage}
              color="#2196F3"
              style={styles.progressBar}
            />
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {formatGrams(nutritionSummary.carbs)}
              </Text>
              <Text style={styles.goalValue}>
                / {goals?.carbs_target_grams ? formatGrams(goals.carbs_target_grams) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.nutrientRow}>
          <Text style={styles.nutrientLabel}>Fat</Text>
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={fatPercentage}
              color="#FF9800"
              style={styles.progressBar}
            />
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {formatGrams(nutritionSummary.fat)}
              </Text>
              <Text style={styles.goalValue}>
                / {goals?.fat_target_grams ? formatGrams(goals.fat_target_grams) : '—'}
              </Text>
            </View>
          </View>
        </View>
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
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutrientLabel: {
    width: 70,
    fontWeight: 'bold',
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  value: {
    fontWeight: 'bold',
  },
  goalValue: {
    color: '#757575',
  },
});

export default NutritionSummaryCard;