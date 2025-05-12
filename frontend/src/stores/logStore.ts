import { create } from 'zustand';
import { Food } from '../types/Food';

interface LogState {
  foods: Food[];
  addFoodToLog: (food: Food) => void;
  removeFoodFromLog: (foodId: number) => void;
  clearLog: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  foods: [],
  addFoodToLog: (food) => set((state) => ({
    foods: [...state.foods, food]
  })),
  removeFoodFromLog: (foodId) => set((state) => ({
    foods: state.foods.filter(food => food.id !== foodId)
  })),
  clearLog: () => set({ foods: [] })
}));