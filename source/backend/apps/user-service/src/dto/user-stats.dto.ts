export class UserStatsDto {
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
