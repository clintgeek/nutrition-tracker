import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

import GoalsScreen from '../screens/goals/GoalsScreen';
import WeightGoalsScreen from '../screens/goals/WeightGoalsScreen';
import CustomHeader from '../components/CustomHeader';

// Define the stack navigator param list
export type GoalsStackParamList = {
  GoalsList: undefined;
  GoalDetails: { goalId: string };
  AddGoal: undefined;
  WeightGoals: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator();

// Goals stack navigator component
const GoalsStackNavigator: React.FC = () => {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="GoalsList"
        component={GoalsScreen}
        options={{
          title: 'Nutrition Goals',
          header: (props) => (
            <CustomHeader
              title="Nutrition Goals"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="WeightGoals"
        component={WeightGoalsScreen}
        options={{
          title: 'Weight Goals',
          header: (props) => (
            <CustomHeader
              title="Weight Goals"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
    </Stack.Navigator>
  );
};

export default GoalsStackNavigator;