import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { RedisTokenStore } from './redis-token-store.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockRedisStore = {
    isBlacklisted: jest.fn(),
    blacklist: jest.fn(),
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
    snsPasswordHash: null,
    snsIsActive: true,
    snsLastLoginAt: null,
    snsAvatarUrl: null,
    snsBio: null,
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

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('1h');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisTokenStore, useValue: mockRedisStore },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  describe('issueTokenPair()', () => {
    it('should return accessToken and refreshToken', async () => {
      const user = makeUser();
      mockJwtService.sign
        .mockReturnValueOnce('access-token-abc')
        .mockReturnValueOnce('refresh-token-xyz');

      const result = await service.issueTokenPair(user, ['admin'], false);

      expect(result.accessToken).toBe('access-token-abc');
      expect(result.refreshToken).toBe('refresh-token-xyz');
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);

      // Verify access token payload
      const accessCall = mockJwtService.sign.mock.calls[0];
      expect(accessCall[0]).toMatchObject({
        sub: 1001,
        type: 'access',
        permissions: ['admin'],
      });
      expect(accessCall[1]).toEqual({ expiresIn: '1h' });

      // Verify refresh token payload
      const refreshCall = mockJwtService.sign.mock.calls[1];
      expect(refreshCall[0]).toMatchObject({
        sub: 1001,
        type: 'refresh',
      });
      expect(refreshCall[1]).toEqual({ expiresIn: '24h' });
    });

    it('should include user data in response', async () => {
      const user = makeUser({ shainBangou: 2002, lastNumber: 200, email: 'user@test.com' });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.issueTokenPair(user, [], false);

      expect(result.user).toBeDefined();
      expect(result.user.shainBangou).toBe(2002);
      expect(result.user.lastNumber).toBe(200);
      expect(result.user.email).toBe('user@test.com');
    });

    it('should set needsPassword flag when user has no password', async () => {
      const user = makeUser({ snsPasswordHash: null });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.issueTokenPair(user, [], false);

      expect(result.needsPassword).toBe(true);
    });

    it('should set needsPassword to false when user has password', async () => {
      const user = makeUser({ snsPasswordHash: 'some-hash' });
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.issueTokenPair(user, [], false);

      expect(result.needsPassword).toBe(false);
    });

    it('should use 30d refresh expiry when rememberMe is true', async () => {
      const user = makeUser();
      mockJwtService.sign.mockReturnValue('token');

      await service.issueTokenPair(user, [], true);

      const refreshCall = mockJwtService.sign.mock.calls[1];
      expect(refreshCall[1]).toEqual({ expiresIn: '30d' });
    });

    it('should use 24h refresh expiry when rememberMe is false', async () => {
      const user = makeUser();
      mockJwtService.sign.mockReturnValue('token');

      await service.issueTokenPair(user, [], false);

      const refreshCall = mockJwtService.sign.mock.calls[1];
      expect(refreshCall[1]).toEqual({ expiresIn: '24h' });
    });

    it('should include expiresIn in seconds', async () => {
      const user = makeUser();
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.issueTokenPair(user, [], false);

      expect(result.expiresIn).toBe(3600); // 1h = 3600 seconds
    });
  });
});
