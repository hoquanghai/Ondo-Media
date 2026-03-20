export interface UserProfile {
  shainBangou: number;
  lastNumber: number;
  email: string;
  shainName: string;
  fullName: string;
  shainGroup: string;
  shainYaku: string;
  bio: string;
  avatar: string;
  snsAvatarUrl: string;
  snsBio: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalPosts: number;
  postsThisMonth: number;
  activeDaysLast30: number;
  currentStreak: number;
  longestStreak: number;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  missedDaysThisMonth: number;
  lastPostDate: string | null;
}

export interface UpdateProfileRequest {
  shainName?: string;
  snsBio?: string;
  avatar?: File;
}
