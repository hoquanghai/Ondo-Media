import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { MicrosoftAuthProvider } from './microsoft-auth.provider';
import { User } from '@app/database/entities/user.entity';
import { UserPermission } from '@app/database/entities/user-permission.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUserRepo = {
    query: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserPermissionRepo = {
    find: jest.fn(),
  };

  const mockTokenService = {
    issueTokenPair: jest.fn(),
    decodeRefreshToken: jest.fn(),
    refresh: jest.fn(),
    verify: jest.fn(),
    blacklist: jest.fn(),
  };

  const mockMsAuth = {
    exchangeCodeForUser: jest.fn(),
  };

  const makeUser = (overrides: Partial<Record<string, any>> = {}): any => ({
    shainBangou: 1001,
    lastNumber: 100,
    username: 'testuser',
    email: 'test@example.com',
    shainName: 'Test User',
    shainGroup: 'Dev',
    shainTeam: 'TeamA',
    shainYaku: 'Engineer',
    shainSection: 'SectionA',
    shainShigotoba: 'Office',
    shainShigotoJoutai: 'Active',
    snsIsActive: true,
    snsPasswordHash: null,
    snsLastLoginAt: null,
    snsBio: null,
    snsAvatarUrl: null,
    avatar: null,
    fullName: 'Test User',
    get displayName() { return this.shainName || ''; },
    get department() { return this.shainGroup || ''; },
    get position() { return this.shainYaku || ''; },
    get defaultAvatarUrl() { return null; },
    get avatarUrl() { return null; },
    get bio() { return null; },
    get isActive() { return this.snsIsActive; },
    ...overrides,
  });

  const mockAuthResponse = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresIn: 3600,
    user: { shainBangou: 1001 },
    needsPassword: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserPermission), useValue: mockUserPermissionRepo },
        { provide: TokenService, useValue: mockTokenService },
        { provide: MicrosoftAuthProvider, useValue: mockMsAuth },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Default: loadPermissions returns empty array
    mockUserPermissionRepo.find.mockResolvedValue([]);
    mockTokenService.issueTokenPair.mockResolvedValue(mockAuthResponse);
  });

  // ─── login() ───

  describe('login()', () => {
    it('should login successfully with valid lastNumber (no password set)', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.update.mockResolvedValue(undefined);

      const result = await service.login({ lastNumber: 100 });

      expect(result).toEqual(mockAuthResponse);
      expect(mockTokenService.issueTokenPair).toHaveBeenCalledWith(user, [], false);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { shainBangou: 1001 },
        expect.objectContaining({ snsLastLoginAt: expect.any(Date) }),
      );
    });

    it('should login successfully with correct password', async () => {
      const user = makeUser({ snsPasswordHash: 'hashed-password' });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.update.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ lastNumber: 100, password: 'correct-pass' });

      expect(result).toEqual(mockAuthResponse);
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-pass', 'hashed-password');
    });

    it('should reject invalid lastNumber', async () => {
      mockUserRepo.query.mockResolvedValue([]);
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ lastNumber: 9999 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject wrong password', async () => {
      const user = makeUser({ snsPasswordHash: 'hashed-password' });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ lastNumber: 100, password: 'wrong-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject inactive user', async () => {
      const user = makeUser({ snsIsActive: false });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.login({ lastNumber: 100 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should enforce rate limiting after 5 failed attempts', async () => {
      mockUserRepo.query.mockResolvedValue([]);
      mockUserRepo.findOne.mockResolvedValue(null);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await expect(service.login({ lastNumber: 999 })).rejects.toThrow(UnauthorizedException);
      }

      // 6th attempt should be rate-limited with a different message
      await expect(service.login({ lastNumber: 999 })).rejects.toThrow(
        'ログイン試行回数が上限を超えました',
      );
    });

    it('should support rememberMe flag', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.update.mockResolvedValue(undefined);

      await service.login({ lastNumber: 100, rememberMe: true });

      expect(mockTokenService.issueTokenPair).toHaveBeenCalledWith(user, [], true);
    });

    it('should reject when password is provided but not set', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.login({ lastNumber: 100, password: 'some-pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject when password is set but not provided', async () => {
      const user = makeUser({ snsPasswordHash: 'hashed' });
      mockUserRepo.query.mockResolvedValue([{ shainBangou: 1001 }]);
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.login({ lastNumber: 100 }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── createPassword() ───

  describe('createPassword()', () => {
    it('should create password for user without one', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.update.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.createPassword({
        shainBangou: 1001,
        password: 'new-password',
      });

      expect(result).toEqual({ success: true });
      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { shainBangou: 1001 },
        expect.objectContaining({
          snsPasswordHash: 'new-hash',
          snsPasswordCreatedAt: expect.any(Date),
        }),
      );
    });

    it('should reject if password already exists', async () => {
      const user = makeUser({ snsPasswordHash: 'existing-hash' });
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.createPassword({ shainBangou: 1001, password: 'new-pass' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPassword({ shainBangou: 9999, password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── changePassword() ───

  describe('changePassword()', () => {
    it('should change password with correct old password', async () => {
      const user = makeUser({ snsPasswordHash: 'old-hash' });
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.update.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.changePassword({
        shainBangou: 1001,
        oldPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(result).toEqual({ success: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('old-pass', 'old-hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('new-pass', 10);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { shainBangou: 1001 },
        { snsPasswordHash: 'new-hash' },
      );
    });

    it('should reject wrong old password', async () => {
      const user = makeUser({ snsPasswordHash: 'old-hash' });
      mockUserRepo.findOne.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword({
          shainBangou: 1001,
          oldPassword: 'wrong-pass',
          newPassword: 'new-pass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if no password is set yet', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(
        service.changePassword({
          shainBangou: 1001,
          oldPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword({
          shainBangou: 9999,
          oldPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
