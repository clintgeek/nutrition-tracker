// Global declarations for modules without type definitions

declare module 'react-native-paper' {
  export const useTheme: () => any;
  export const Card: any;
  export const Title: any;
  export const Text: any;
  export const Paragraph: any;
  export const ProgressBar: any;
  export const Divider: any;
  export const ActivityIndicator: any;
  export const Avatar: any;
  export const Chip: any;
  export const Button: any;
  export const List: any;
  export const Switch: any;
  export const Dialog: any;
  export const Portal: any;
  export const Provider: any;
  export const DefaultTheme: any;
  export const Searchbar: any;
  export const FAB: any;
}

declare module 'react-native-chart-kit' {
  export const PieChart: any;
  export const LineChart: any;
}

declare module '@react-navigation/native' {
  export const useNavigation: <T = any>() => T;
  export const useIsFocused: () => boolean;
  export const useFocusEffect: (effect: (callback: () => void | (() => void)) => void) => void;
  export const NavigationContainer: any;
}

declare module '@react-navigation/stack' {
  export const createStackNavigator: () => any;
  export type StackNavigationProp<T, K extends keyof T = keyof T> = any;
}

declare module '@react-navigation/bottom-tabs' {
  export const createBottomTabNavigator: () => any;
}

declare module '@expo/vector-icons' {
  export const MaterialCommunityIcons: any;
  export const Ionicons: any;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: any;
  export default AsyncStorage;
}

declare module '@react-native-community/datetimepicker' {
  const DateTimePicker: any;
  export default DateTimePicker;
}

declare module 'expo-image-picker' {
  export const MediaTypeOptions: any;
  export const requestMediaLibraryPermissionsAsync: () => Promise<any>;
  export const launchImageLibraryAsync: (options: any) => Promise<any>;
}

// Override service declarations to match component expectations
declare module '../services/foodLogService' {
  import { FoodLog } from '../types/FoodLog';

  export const foodLogService: {
    getLogs: (date: string) => Promise<FoodLog[]>;
    getFoodLogsByDate: (date: string) => Promise<FoodLog[]>;
    getFoodLogsByDateRange: (startDate: string, endDate: string) => Promise<FoodLog[]>;
    getLogSummary: (startDate: string, endDate: string) => Promise<any>;
    createLog: (log: Partial<FoodLog>) => Promise<FoodLog>;
    updateLog: (id: string, log: Partial<FoodLog>) => Promise<FoodLog>;
    deleteLog: (id: string) => Promise<void>;
    // Add other methods as needed
  };
}