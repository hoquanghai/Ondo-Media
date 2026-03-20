import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@app/database/entities/user.entity';
import { UserPermission } from '@app/database/entities/user-permission.entity';
import { TokenService } from './token.service';
import { MicrosoftAuthProvider } from './microsoft-auth.provider';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepo: Repository<UserPermission>,
    private readonly tokenService: TokenService,
    private readonly msAuth: MicrosoftAuthProvider,
  ) {}

  /**
   * Login by lastNumber (社員番号).
   *
   * Rules:
   * - If sns_password_hash is NULL AND password is empty → login success (first time, no password set)
   * - If sns_password_hash is NULL AND password is provided → reject
   * - If sns_password_hash is NOT NULL AND password is empty → reject
   * - If sns_password_hash is NOT NULL → validate bcrypt
   */
  async login(data: {
    lastNumber: number;
    password?: string;
    rememberMe?: boolean;
  }): Promise<AuthResponseDto> {
    const { lastNumber, password, rememberMe } = data;

    this.logger.log(`Login attempt: lastNumber=${lastNumber}, type=${typeof lastNumber}`);

    // Raw query to avoid TypeORM cross-database issues
    const rows = await this.userRepo.query(
      `SELECT * FROM [DR].[dbo].[shainList] WHERE [lastNumber] = @0`,
      [Number(lastNumber)],
    );
    const user = rows.length > 0 ? await this.userRepo.findOne({ where: { shainBangou: rows[0].shainBangou } }) : null;

    this.logger.log(`Found user: ${user ? `shainBangou=${user.shainBangou}, name=${user.shainName}, lastNumber=${user.lastNumber}` : 'null'}`);

    if (!user) {
      throw new UnauthorizedException(
        '社員番号が正しくありません',
      );
    }

    if (!user.snsIsActive) {
      throw new UnauthorizedException('アカウントが無効化されています');
    }

    const hasPassword = !!user.snsPasswordHash;
    const passwordProvided = !!password && password.length > 0;

    if (!hasPassword && !passwordProvided) {
      // First-time login: no password set, no password provided → allow
      this.logger.log(`First-time login for lastNumber=${lastNumber} (shainBangou=${user.shainBangou}, no password set)`);
    } else if (!hasPassword && passwordProvided) {
      // Password not set yet but user provided one → reject
      throw new UnauthorizedException(
        'パスワードが未設定です。パスワードなしでログインしてください。',
      );
    } else if (hasPassword && !passwordProvided) {
      // Password is set but user didn't provide one → reject
      throw new UnauthorizedException(
        'パスワードを入力してください',
      );
    } else if (hasPassword && passwordProvided) {
      // Validate password
      const isValid = await bcrypt.compare(password!, user.snsPasswordHash);
      if (!isValid) {
        throw new UnauthorizedException(
          '社員番号またはパスワードが正しくありません',
        );
      }
    }

    // Update sns_last_login_at
    await this.userRepo.update(
      { shainBangou: user.shainBangou },
      { snsLastLoginAt: new Date() },
    );

    const permissions = await this.loadPermissions(user.shainBangou);

    return this.tokenService.issueTokenPair(user, permissions, rememberMe ?? false);
  }

  /**
   * Microsoft 365 SSO login.
   * Match by email or sns_ms365_id.
   */
  async loginMicrosoft(data: {
    code: string;
    redirectUri?: string;
    rememberMe?: boolean;
  }): Promise<AuthResponseDto> {
    const { code, redirectUri, rememberMe } = data;

    const msUser = await this.msAuth.exchangeCodeForUser(
      code,
      redirectUri ?? '',
    );

    // Try matching by sns_ms365_id first
    let user = await this.userRepo.findOne({
      where: { snsMs365Id: msUser.oid },
    });

    // If not found, try matching by email
    if (!user && msUser.mail) {
      user = await this.userRepo.findOne({
        where: { email: msUser.mail },
      });
    }

    if (!user && msUser.preferredUsername) {
      user = await this.userRepo.findOne({
        where: { email: msUser.preferredUsername },
      });
    }

    if (!user) {
      throw new UnauthorizedException(
        'Microsoft アカウントに対応する社員が見つかりません。管理者に連絡してください。',
      );
    }

    if (!user.snsIsActive) {
      throw new UnauthorizedException('アカウントが無効化されています');
    }

    // Link MS365 ID if not already set + update last login
    const updateData: Partial<User> = { snsLastLoginAt: new Date() };
    if (!user.snsMs365Id) {
      updateData.snsMs365Id = msUser.oid;
    }
    await this.userRepo.update({ shainBangou: user.shainBangou }, updateData);

    this.logger.log(`MS365 login for shainBangou=${user.shainBangou}`);

    const permissions = await this.loadPermissions(user.shainBangou);

    return this.tokenService.issueTokenPair(user, permissions, rememberMe ?? false);
  }

  /**
   * Refresh tokens — validate the old refresh token and issue a new pair.
   */
  async refresh(data: { refreshToken: string; rememberMe?: boolean }): Promise<AuthResponseDto> {
    const { refreshToken, rememberMe } = data;

    // Decode to get user ID
    const decoded = this.tokenService.decodeRefreshToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      throw new UnauthorizedException('無効なリフレッシュトークンです');
    }

    const user = await this.userRepo.findOne({
      where: { shainBangou: decoded.sub },
    });

    if (!user || !user.snsIsActive) {
      throw new UnauthorizedException('ユーザーが見つからないか無効です');
    }

    const permissions = await this.loadPermissions(user.shainBangou);

    return this.tokenService.refresh(refreshToken, user, permissions, rememberMe ?? false);
  }

  /**
   * Logout — blacklist the access and refresh tokens.
   */
  async logout(data: {
    accessToken: string;
    refreshToken?: string;
  }): Promise<{ success: true }> {
    const { accessToken, refreshToken } = data;

    if (accessToken) {
      await this.tokenService.blacklist(accessToken);
    }
    if (refreshToken) {
      await this.tokenService.blacklist(refreshToken);
    }

    return { success: true };
  }

  /**
   * Validate an access token and return the payload.
   */
  async validateToken(data: { token: string }) {
    return this.tokenService.verify(data.token);
  }

  /**
   * Get current user info by shainBangou.
   */
  async getCurrentUser(data: { userId: number }) {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.userId },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    const permissions = await this.loadPermissions(user.shainBangou);

    return {
      shainBangou: user.shainBangou,
      lastNumber: user.lastNumber,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      shainName: user.shainName,
      displayName: user.displayName,
      shainGroup: user.shainGroup,
      shainTeam: user.shainTeam,
      shainYaku: user.shainYaku,
      shainSection: user.shainSection,
      shainShigotoba: user.shainShigotoba,
      shainShigotoJoutai: user.shainShigotoJoutai,
      avatar: user.defaultAvatarUrl,
      avatarUrl: user.avatarUrl,
      snsAvatarUrl: user.snsAvatarUrl || null,
      bio: user.bio,
      snsIsActive: user.snsIsActive,
      snsLastLoginAt: user.snsLastLoginAt ? user.snsLastLoginAt.toISOString() : null,
      hasPassword: !!user.snsPasswordHash,
      permissions,
    };
  }

  /**
   * Create a new SNS password (first-time setup).
   */
  async createPassword(data: {
    shainBangou: number;
    password: string;
  }): Promise<{ success: true }> {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.shainBangou },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    if (user.snsPasswordHash) {
      throw new BadRequestException(
        'パスワードは既に設定されています。変更する場合はパスワード変更を使用してください。',
      );
    }

    const hash = await bcrypt.hash(data.password, 10);
    await this.userRepo.update(
      { shainBangou: data.shainBangou },
      { snsPasswordHash: hash, snsPasswordCreatedAt: new Date() },
    );

    this.logger.log(`Password created for shainBangou=${data.shainBangou}`);

    return { success: true };
  }

  /**
   * Change existing SNS password.
   */
  async changePassword(data: {
    shainBangou: number;
    oldPassword: string;
    newPassword: string;
  }): Promise<{ success: true }> {
    const user = await this.userRepo.findOne({
      where: { shainBangou: data.shainBangou },
    });

    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }

    if (!user.snsPasswordHash) {
      throw new BadRequestException(
        'パスワードが未設定です。先にパスワード作成を行ってください。',
      );
    }

    const isValid = await bcrypt.compare(data.oldPassword, user.snsPasswordHash);
    if (!isValid) {
      throw new UnauthorizedException('現在のパスワードが正しくありません');
    }

    const hash = await bcrypt.hash(data.newPassword, 10);
    await this.userRepo.update(
      { shainBangou: data.shainBangou },
      { snsPasswordHash: hash },
    );

    this.logger.log(`Password changed for shainBangou=${data.shainBangou}`);

    return { success: true };
  }

  /**
   * Load permission names for a given user (by shainBangou).
   */
  private async loadPermissions(shainBangou: number): Promise<string[]> {
    const userPermissions = await this.userPermissionRepo.find({
      where: { userId: shainBangou, isDeleted: false },
      relations: ['permission'],
    });

    return userPermissions
      .filter((up) => up.permission && !up.permission.isDeleted)
      .map((up) => up.permission.name);
  }
}
