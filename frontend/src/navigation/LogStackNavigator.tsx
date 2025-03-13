import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

import LogScreen from '../screens/log/LogScreen';
import AddLogScreen from '../screens/log/AddLogScreen';
import AddFoodToLogModal from '../screens/log/AddFoodToLogModal';
import SearchFoodForLogScreen from '../screens/log/SearchFoodForLogScreen';
import CustomHeader from '../components/CustomHeader';
import { Food } from '../types/Food';

// Define the stack navigator param list
export type LogStackParamList = {
  LogList: undefined;
  LogDetails: { logId: string };
  AddLog: { date: string; mealType?: string };
  AddFoodToLogModal: { food: Food; mealType?: string; date?: string };
  SearchFoodForLog: { mealType: string; date: string };
};

// Create the stack navigator
const Stack = createStackNavigator();

// Log stack navigator component
const LogStackNavigator: React.FC = () => {
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
        name="LogList"
        component={LogScreen}
        options={{
          title: 'Food Logs',
          header: (props) => (
            <CustomHeader
              title="Food Logs"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="AddLog"
        component={AddLogScreen}
        options={{
          title: 'Add Food Log',
          header: (props) => (
            <CustomHeader
              title="Add Food Log"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="SearchFoodForLog"
        component={SearchFoodForLogScreen}
        options={{
          title: 'Search Foods',
          header: (props) => (
            <CustomHeader
              title="Search Foods"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="AddFoodToLogModal"
        component={AddFoodToLogModal}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default LogStackNavigator;