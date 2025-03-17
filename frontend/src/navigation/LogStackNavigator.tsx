import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/routers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

import LogScreen from '../screens/log/LogScreen';
import AddLogScreen from '../screens/log/AddLogScreen';
import AddFoodToLogModal from '../screens/log/AddFoodToLogModal';
import SearchFoodForLogScreen from '../screens/log/SearchFoodForLogScreen';
import CustomHeader from '../components/CustomHeader';
import { Food } from '../types/Food';

// Define drawer navigation type
type DrawerParamList = {
  MainTabs: undefined;
  NutritionGoals: undefined;
  WeightGoals: undefined;
};

type NavigationProp = DrawerNavigationProp<DrawerParamList>;

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

  // Function to render header with hamburger menu
  const renderHeaderWithMenu = (title: string, showBack: boolean = false) => {
    return (props: any) => {
      const navigation = useNavigation();

      const MenuButton = () => (
        <TouchableOpacity
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          style={{ marginLeft: 10 }}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      );

      return (
        <CustomHeader
          title={title}
          showBackButton={showBack || props.back !== undefined}
          leftComponent={!showBack && !props.back ? <MenuButton /> : undefined}
        />
      );
    };
  };

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
          header: renderHeaderWithMenu('Food Logs')
        }}
      />
      <Stack.Screen
        name="AddLog"
        component={AddLogScreen}
        options={{
          title: 'Add Food Log',
          header: renderHeaderWithMenu('Add Food Log', true)
        }}
      />
      <Stack.Screen
        name="SearchFoodForLog"
        component={SearchFoodForLogScreen}
        options={{
          title: 'Search Foods',
          header: renderHeaderWithMenu('Search Foods', true)
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