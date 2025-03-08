import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import BarcodeScreen from '../screens/food/BarcodeScreen';
import FoodDetailScreen from '../screens/food/FoodDetailScreen';
import AddFoodScreen from '../screens/food/AddFoodScreen';
import EditFoodScreen from '../screens/food/EditFoodScreen';
import AddLogScreen from '../screens/log/AddLogScreen';
import EditLogScreen from '../screens/log/EditLogScreen';
import AddGoalScreen from '../screens/goal/AddGoalScreen';
import EditGoalScreen from '../screens/goal/EditGoalScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';

// Define the stack navigator param list
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Loading: undefined;
  Barcode: undefined;
  FoodDetail: { foodId: number } | { barcode: string };
  AddFood: undefined;
  EditFood: { foodId: number };
  AddLog: { foodId?: number; date?: string };
  EditLog: { logId: number };
  AddGoal: undefined;
  EditGoal: { goalId: number };
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

// Create the stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Barcode" component={BarcodeScreen} />
          <Stack.Screen name="FoodDetail" component={FoodDetailScreen} />
          <Stack.Screen name="AddFood" component={AddFoodScreen} />
          <Stack.Screen name="EditFood" component={EditFoodScreen} />
          <Stack.Screen name="AddLog" component={AddLogScreen} />
          <Stack.Screen name="EditLog" component={EditLogScreen} />
          <Stack.Screen name="AddGoal" component={AddGoalScreen} />
          <Stack.Screen name="EditGoal" component={EditGoalScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </>
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