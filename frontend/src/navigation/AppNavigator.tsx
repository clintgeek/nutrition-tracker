import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../contexts/AuthContext';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/routers';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
  // Function to render header with hamburger menu
  const renderHeaderWithMenu = (title: string) => {
    return () => {
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
          showBackButton={false}
          leftComponent={<MenuButton />}
        />
      );
    };
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          borderTopWidth: 0
        }
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          title: 'Home',
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="NutritionGoals"
        component={NutritionGoalsScreen}
        options={{
          title: 'Nutrition Goals',
          headerShown: true,
          header: renderHeaderWithMenu('Nutrition Goals'),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="WeightGoals"
        component={WeightGoalsScreen}
        options={{
          title: 'Weight Goals',
          headerShown: true,
          header: renderHeaderWithMenu('Weight Goals'),
          drawerIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="scale-bathroom" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// App navigator component
const AppNavigator: React.FC = () => {
  const { user, token, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      // Force the navigator to recreate its screens when the user state changes
      key={user ? 'user' : 'no-user'}
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
