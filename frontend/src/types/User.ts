export interface User {
  id: string;
  email: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  weightGoal?: 'lose' | 'maintain' | 'gain';
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  name?: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  activityLevel?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  weightGoal?: 'lose' | 'maintain' | 'gain';
  profilePicture?: string;
}