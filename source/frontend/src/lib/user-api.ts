import { api } from "./api";
import { API_ENDPOINTS } from "./constants";

/** ユーザー詳細プロフィール（設定ページ用） */
export interface UserDetailProfile {
  shainBangou: number;
  lastNumber: number;
  shainName: string;
  fullName: string;
  shainGroup: string;
  shainTeam: string;
  shainYaku: string;
  shainSection: string;
  birthday: string | null;
  address1: string | null;
  phone: string | null;
  mobile: string | null;
  email: string;
  entranceDate: string | null;
  avatar: string;
  snsAvatarUrl: string | null;
  snsBio: string | null;
  hasPassword: boolean;
}

/** プロフィール更新リクエスト */
export interface UpdateUserProfileRequest {
  shainName?: string;
  email?: string;
  phone?: string;
  birthday?: string | null;
  address1?: string | null;
  snsBio?: string | null;
}

/**
 * ユーザー API サービス
 */
export const userApi = {
  /** 自分の詳細プロフィールを取得 */
  getMyProfile() {
    return api.get<UserDetailProfile>(`${API_ENDPOINTS.USERS}/me`);
  },

  /** プロフィールを更新 */
  updateMyProfile(data: UpdateUserProfileRequest) {
    return api.patch<UserDetailProfile>(`${API_ENDPOINTS.USERS}/me`, data);
  },

  /** アバター画像をアップロード */
  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.request<{ url: string }>(`${API_ENDPOINTS.USERS}/me/avatar`, {
      method: "POST",
      body: formData,
    });
  },
};
