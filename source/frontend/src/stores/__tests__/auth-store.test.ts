import { useAuthStore } from '../auth-store';

// Mock dependencies
jest.mock('@/lib/auth-api', () => ({
  authApi: {
    loginWithShainBangou: jest.fn(),
    logout: jest.fn(),
    createPassword: jest.fn(),
    refreshToken: jest.fn(),
    getMe: jest.fn(),
  },
}));

jest.mock('@/lib/token-refresh', () => ({
  startTokenRefresh: jest.fn(),
  stopTokenRefresh: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  env: {
    apiBaseUrl: 'http://localhost:3000/api/v1',
    wsUrl: 'http://localhost:3026',
    appName: 'Test',
  },
}));

import { authApi } from '@/lib/auth-api';

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

// Reset store state before each test
beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    showCreatePasswordDialog: false,
  });
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('should be unauthenticated', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login()', () => {
    it('should set user and tokens on successful login', async () => {
      const mockResponse = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        user: {
          shainBangou: 1,
          lastNumber: 1001,
          shainName: 'Test User',
          shainGroup: 'Engineering',
          email: 'test@example.com',
          avatar: 'https://example.com/avatar.png',
          hasPassword: true,
          permissions: ['read'],
        },
      };

      mockedAuthApi.loginWithShainBangou.mockResolvedValue(mockResponse as any);

      await useAuthStore.getState().login(1001, 'password123');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.accessToken).toBe('access-123');
      expect(state.refreshToken).toBe('refresh-456');
      expect(state.user?.shainName).toBe('Test User');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on login failure', async () => {
      mockedAuthApi.loginWithShainBangou.mockRejectedValue(new Error('Invalid'));

      await expect(useAuthStore.getState().login(9999, 'wrong')).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout()', () => {
    it('should clear state on logout', async () => {
      // Set up authenticated state first
      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: {
          shainBangou: 1,
          lastNumber: 1001,
          shainName: 'Test',
          shainGroup: 'Eng',
          email: 'test@example.com',
          avatar: '',
          hasPassword: true,
          permissions: [],
        },
        isAuthenticated: true,
      });

      mockedAuthApi.logout.mockResolvedValue(undefined as any);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('should clear state even if logout API fails', async () => {
      useAuthStore.setState({
        accessToken: 'token',
        isAuthenticated: true,
      });

      mockedAuthApi.logout.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.accessToken).toBeNull();
    });
  });

  describe('createPassword()', () => {
    it('should update hasPassword on success', async () => {
      useAuthStore.setState({
        user: {
          shainBangou: 1,
          lastNumber: 1001,
          shainName: 'Test',
          shainGroup: 'Eng',
          email: 'test@example.com',
          avatar: '',
          hasPassword: false,
          permissions: [],
        },
        isAuthenticated: true,
        showCreatePasswordDialog: true,
      });

      mockedAuthApi.createPassword.mockResolvedValue(undefined as any);

      await useAuthStore.getState().createPassword('newpass', 'newpass');

      const state = useAuthStore.getState();
      expect(state.user?.hasPassword).toBe(true);
      expect(state.showCreatePasswordDialog).toBe(false);
    });

    it('should throw on failure', async () => {
      useAuthStore.setState({
        user: {
          shainBangou: 1,
          lastNumber: 1001,
          shainName: 'Test',
          shainGroup: 'Eng',
          email: 'test@example.com',
          avatar: '',
          hasPassword: false,
          permissions: [],
        },
      });

      mockedAuthApi.createPassword.mockRejectedValue(new Error('Fail'));

      await expect(
        useAuthStore.getState().createPassword('pass', 'pass'),
      ).rejects.toThrow('パスワードの作成に失敗しました');
    });
  });
});
