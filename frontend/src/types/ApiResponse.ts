export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: boolean;
  error: string;
  statusCode: number;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    [key: string]: any;
  };
}

export interface SyncResponse {
  lastSyncTimestamp: string;
  changes: {
    foods: {
      added: any[];
      updated: any[];
      deleted: string[];
    };
    foodLogs: {
      added: any[];
      updated: any[];
      deleted: string[];
    };
    goals: {
      added: any[];
      updated: any[];
      deleted: string[];
    };
  };
}