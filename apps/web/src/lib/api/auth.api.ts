import api, { post, get, tokenStore } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  tenantId: string;
  avatarUrl?: string;
  permissions: string[];
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export const authApi = {
  login: (payload: LoginPayload): Promise<AuthResponse> =>
    post<AuthResponse>('/auth/login', payload),

  register: (payload: RegisterPayload): Promise<AuthResponse> =>
    post<AuthResponse>('/auth/register', payload),

  refresh: (refreshToken: string): Promise<AuthTokens> =>
    post<AuthTokens>('/auth/refresh', { refreshToken }),

  logout: (): Promise<void> => post('/auth/logout'),

  me: (): Promise<UserProfile> => get('/auth/me'),
};
