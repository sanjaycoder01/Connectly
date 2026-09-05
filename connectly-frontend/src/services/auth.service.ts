import type { AuthResponse, LoginCredentials, SignupCredentials } from '../types/auth';

const API_BASE = '/api';

class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send & receive HTTP-only cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'Something went wrong', response.status);
  }

  return data as T;
}

export const authService = {
  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getMe: async (): Promise<AuthResponse> => {
    return request<AuthResponse>('/users/me', {
      method: 'GET',
    });
  },

  logout: async (): Promise<{ message: string }> => {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },
};
