import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/routers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MealPlannerScreen } from '../screens/meal/MealPlannerScreen';
import CustomHeader from '../components/CustomHeader';

// Create the stack navigator
const Stack = createStackNavigator();

// MealPlanner stack navigator component
export const MealPlannerStackNavigator: React.FC = () => {
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
        name="MealPlanner"
        component={MealPlannerScreen}
        options={{
          title: 'Meal Planner',
          header: renderHeaderWithMenu('Meal Planner')
        }}
      />
    </Stack.Navigator>
  );
};