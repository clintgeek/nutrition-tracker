import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Food } from './Food';

// Auth Stack Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Root Stack Types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Loading: undefined;
  NutritionGoals: undefined;
  WeightGoals: undefined;
  BloodPressure: undefined;
};

// Main Tab Types
export type MainTabParamList = {
  Home: undefined;
  Log: undefined;
  Food: undefined;
  Recipe: undefined;
  MealPlanner: undefined;
  WeightGoals: undefined;
  BloodPressure: undefined;
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
  FoodScreen: {
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
  RecipeDetail: { recipeId: number | 'new'; selectedIngredient?: Food };
  SearchFoodForRecipe: { recipeId: number | 'new' };
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
  RecipeDetail: { recipeId: number | 'new'; selectedIngredient?: Food };
  SearchFoodForRecipe: { recipeId: number | 'new' };
};

// Log Stack Types
export type LogStackParamList = {
  LogList: undefined;
  LogDetails: { logId: string };
  AddLog: { date: string; mealType?: string };
  AddFoodToLogModal: { food: Food; mealType?: string; date?: string };
  SearchFoodForLogScreen: { mealType: string; date: string };
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