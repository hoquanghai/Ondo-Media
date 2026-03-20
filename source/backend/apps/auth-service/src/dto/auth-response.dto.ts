export class AuthUserDto {
  shainBangou: number;
  lastNumber: number;
  username: string;
  email: string;
  shainName: string;
  shainGroup: string;
  shainTeam: string;
  shainYaku: string;
  shainSection: string;
  avatar: string | null;
  avatarUrl: string | null;
  snsAvatarUrl: string | null;
  bio: string | null;
  snsIsActive: boolean;
  snsLastLoginAt: string | null;
  hasPassword: boolean;
  permissions: string[];
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserDto;
  needsPassword: boolean;
}
