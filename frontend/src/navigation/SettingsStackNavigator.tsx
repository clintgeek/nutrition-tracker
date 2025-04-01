import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CustomHeader from '../components/CustomHeader';

// Define the stack navigator param list
export type SettingsStackParamList = {
  SettingsMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

// Create the stack navigator
const Stack = createNativeStackNavigator<SettingsStackParamList>();

// Settings stack navigator component
const SettingsStackNavigator: React.FC = () => {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerShown: true,
          header: () => (
            <CustomHeader
              title="Settings"
              leftComponent={
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ padding: 8 }}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              }
            />
          ),
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: true,
          header: () => (
            <CustomHeader
              title="Edit Profile"
              leftComponent={
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{ padding: 8 }}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              }
            />
          ),
        }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;