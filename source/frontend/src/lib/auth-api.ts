import { api } from "./api";
import { API_ENDPOINTS } from "./constants";
import type {
  LoginRequest,
  LoginResponse,
  MicrosoftLoginRequest,
  CreatePasswordRequest,
  RefreshTokenResponse,
} from "@/types/auth";
import type { CurrentUser } from "@/types/user";

/**
 * 認証 API サービス
 */
export const authApi = {
  /** 社員番号・パスワードでログイン */
  loginWithShainBangou(
    shainBangou: number,
    password?: string,
    rememberMe?: boolean,
  ) {
    return api.post<LoginResponse>(API_ENDPOINTS.AUTH_LOGIN, {
      shainBangou,
      password,
      rememberMe,
    } satisfies LoginRequest);
  },

  /** Microsoft 365 SSO でログイン */
  loginWithMicrosoft(code: string, redirectUri: string) {
    return api.post<LoginResponse>(`${API_ENDPOINTS.AUTH_LOGIN}/microsoft`, {
      code,
      redirect_uri: redirectUri,
    } satisfies MicrosoftLoginRequest);
  },

  /** パスワードを作成 */
  createPassword(password: string, confirmPassword: string) {
    return api.post<void>(API_ENDPOINTS.AUTH_CREATE_PASSWORD, {
      password,
      confirmPassword,
    } satisfies CreatePasswordRequest);
  },

  /** パスワードを変更 */
  changePassword(oldPassword: string, newPassword: string) {
    return api.post<void>(API_ENDPOINTS.AUTH_CHANGE_PASSWORD, {
      oldPassword,
      newPassword,
    });
  },

  /** トークンをリフレッシュ */
  refreshToken(refreshToken: string) {
    return api.post<RefreshTokenResponse>(API_ENDPOINTS.AUTH_REFRESH, {
      refresh_token: refreshToken,
    });
  },

  /** ログアウト */
  logout() {
    return api.post<void>(API_ENDPOINTS.AUTH_LOGOUT);
  },

  /** 現在のユーザー情報を取得 */
  getMe() {
    return api.get<CurrentUser>(API_ENDPOINTS.AUTH_ME);
  },
};
