export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  postsToday: number;
  postsThisWeek: number;
  activeSurveys: number;
  totalAnnouncements: number;
}

export interface AdminUser {
  shainBangou: number;
  email: string;
  shainName: string;
  shainGroup: string;
  shainYaku: string;
  isActive: boolean;
  avatar: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CreateUserRequest {
  shainBangou: number;
  email: string;
  shainName: string;
  shainGroup: string;
  shainYaku: string;
  password?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface UserPermission {
  shainBangou: number;
  email: string;
  shainName: string;
  permissions: string[]; // permission id array
}

export interface PermissionMatrix {
  permissions: Permission[];
  users: UserPermission[];
}
