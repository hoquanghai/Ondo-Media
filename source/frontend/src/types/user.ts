export interface User {
  shainBangou: number;     // PK (internal)
  lastNumber: number;      // 社員番号 (display/login)
  shainName: string;       // Display name
  fullName: string;
  shainGroup: string;      // Department
  shainTeam: string;
  shainYaku: string;       // Position
  email: string;
  avatar: string;          // Avatar URL
  snsAvatarUrl: string;    // Custom SNS avatar
  snsBio: string;          // Bio
  entranceDate?: string;
  hasPassword: boolean;
  permissions: string[];
}

export interface CurrentUser {
  shainBangou: number;     // PK (internal)
  lastNumber: number;      // 社員番号 (display/login)
  shainName: string;
  shainGroup: string;
  email: string;
  avatar: string;          // Default avatar from shainList
  snsAvatarUrl?: string;   // Custom avatar set by user on My Page
  hasPassword: boolean;
  permissions: string[];
}
