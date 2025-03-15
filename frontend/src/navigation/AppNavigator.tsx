import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import DrawerContent from './DrawerNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import NutritionGoalsScreen from '../screens/goals/NutritionGoalsScreen';
import WeightGoalsScreen from '../screens/goals/WeightGoalsScreen';
import CustomHeader from '../components/CustomHeader';

// Define the stack navigator param list
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Loading: undefined;
};

// Create the navigators
const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

// Main drawer navigator component
const MainDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          title: 'Home'
        }}
      />
      <Drawer.Screen
        name="NutritionGoals"
        component={NutritionGoalsScreen}
        options={{
          title: 'Nutrition Goals',
          headerShown: true,
          header: () => (
            <CustomHeader
              title="Nutrition Goals"
              showBackButton={true}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="WeightGoals"
        component={WeightGoalsScreen}
        options={{
          title: 'Weight Goals',
          headerShown: true,
          header: () => (
            <CustomHeader
              title="Weight Goals"
              showBackButton={true}
            />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// App navigator component
const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        // Authenticated routes
        <Stack.Screen name="Main" component={MainDrawerNavigator} />
      ) : (
        // Unauthenticated routes
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
