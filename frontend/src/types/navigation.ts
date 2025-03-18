import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Food } from './Food';

// Auth Stack Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Main Stack Types
export type MainStackParamList = {
  Main: undefined;
  Loading: undefined;
};

// Food Stack Types
export type FoodStackParamList = {
  FoodList: {
    scannedFood?: Food;
    addToLog?: boolean;
    logDate?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servings?: number;
  };
  FoodDetails: { foodId: string };
  AddFood: undefined;
  FoodSearch: {
    searchQuery?: string;
    addToLog?: boolean;
    logDate?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servings?: number;
  };
  BarcodeScanner: undefined;
};

// Log Stack Types
export type LogStackParamList = {
  LogList: undefined;
  LogDetails: { logId: string };
  AddLog: { date: string; mealType?: string };
  AddFoodToLogModal: { food: Food; mealType?: string; date?: string };
  SearchFoodForLog: { mealType: string; date: string };
};

// Goals Stack Types
export type GoalsStackParamList = {
  GoalsList: undefined;
  GoalDetails: { goalId: string };
  AddGoal: undefined;
};

// Recipe Stack Types
export type RecipeStackParamList = {
  Recipes: undefined;
  RecipeDetail: { recipeId: string | number | 'new'; selectedIngredient?: Food };
  SearchFoodForRecipe: { recipeId: string | number | 'new' };
};

// Combined Root Stack Type
export type RootStackParamList =
  & AuthStackParamList
  & MainStackParamList
  & RecipeStackParamList
  & {
    FoodStack: undefined;
    LogStack: undefined;
    GoalsStack: undefined;
    RecipeStack: undefined;
  };

// Type for useNavigation hook
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

// Helper type for nested navigation
export type NestedScreenProps<
  ParentParamList,
  ParentRouteName extends keyof ParentParamList,
  ChildParamList
> = NativeStackScreenProps<ParentParamList, ParentRouteName> & {
  childNavigation: NativeStackScreenProps<ChildParamList>['navigation'];
};

// Global type declaration
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}