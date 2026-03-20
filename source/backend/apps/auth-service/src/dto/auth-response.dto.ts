export class AuthUserDto {
  shainBangou: number;
  username: string;
  email: string;
  shainName: string;
  shainGroup: string;
  shainTeam: string;
  shainYaku: string;
  shainSection: string;
  avatarUrl: string | null;
  bio: string | null;
  snsIsActive: boolean;
  snsLastLoginAt: string | null;
  hasPassword: boolean;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserDto;
  needsPassword: boolean;
}
