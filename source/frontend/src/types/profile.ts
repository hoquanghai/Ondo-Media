export interface UserProfile {
  shainBangou: number;
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
  currentStreak: number;
  longestStreak: number;
  likesReceived: number;
  commentsReceived: number;
  missedDaysThisMonth: number;
}

export interface UpdateProfileRequest {
  shainName?: string;
  snsBio?: string;
  avatar?: File;
}
