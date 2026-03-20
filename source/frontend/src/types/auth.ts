import type { CurrentUser } from "./user";

export interface LoginRequest {
  shainBangou: number;
  password?: string;
  rememberMe?: boolean;
}

export interface MicrosoftLoginRequest {
  code: string;
  redirect_uri: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    shainBangou: number;
    shainName: string;
    shainGroup: string;
    email: string;
    avatar: string;
    hasPassword: boolean;
    permissions: string[];
  };
}

export interface CreatePasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: CurrentUser;
}

export interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
