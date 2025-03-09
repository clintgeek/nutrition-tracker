import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

import FoodScreen from '../screens/food/FoodScreen';
import AddFoodScreen from '../screens/food/AddFoodScreen';
import FoodSearchScreen from '../screens/food/FoodSearchScreen';
import CustomHeader from '../components/CustomHeader';

// Define the stack navigator param list
export type FoodStackParamList = {
  FoodList: undefined;
  FoodDetails: { foodId: string };
  AddFood: undefined;
  FoodSearch: undefined;
  BarcodeScanner: undefined;
};

// Create the stack navigator
const Stack = createStackNavigator();

// Food stack navigator component
const FoodStackNavigator: React.FC = () => {
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
        name="FoodList"
        component={FoodScreen}
        options={{
          title: 'Foods',
          header: (props) => (
            <CustomHeader
              title="Foods"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="AddFood"
        component={AddFoodScreen}
        options={{
          title: 'Add Food',
          header: (props) => (
            <CustomHeader
              title="Add Food"
              showBackButton={props.back !== undefined}
            />
          )
        }}
      />
      <Stack.Screen
        name="FoodSearch"
        component={FoodSearchScreen}
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
    </Stack.Navigator>
  );
};

export default FoodStackNavigator;