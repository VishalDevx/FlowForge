export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export type ApiResponseWithMeta<T> = ApiResponse<T> & {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export interface JwtPayload {
  userId: string;
  email: string;
  workspaceId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface RequestWithUser {
  user?: AuthUser;
  userId?: string;
}