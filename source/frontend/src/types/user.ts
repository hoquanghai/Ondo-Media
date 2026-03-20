export interface User {
  shainBangou: number;     // PK
  shainName: string;       // Display name
  fullName: string;
  shainGroup: string;      // Department
  shainTeam: string;
  shainYaku: string;       // Position
  email: string;
  avatar: string;          // Avatar URL
  snsAvatarUrl: string;    // Custom SNS avatar
  snsBio: string;          // Bio
  hasPassword: boolean;
  permissions: string[];
}

export interface CurrentUser {
  shainBangou: number;
  shainName: string;
  shainGroup: string;
  email: string;
  avatar: string;
  hasPassword: boolean;
  permissions: string[];
}
