/**
 * authService.signInUser against POST /auth/login (fetch mocked).
 *
 * An admin-forced password reset must surface as PasswordResetRequiredException, bad
 * credentials as "Invalid email or password", and a successful sign-in must store the
 * session in SecureStore. The password must never reach the console.
 */

import * as SecureStore from 'expo-secure-store';
import { authService } from './auth';
import { STORAGE_KEYS } from './storage-keys';

jest.mock('./api', () => ({
  API_CONFIG: { baseURL: 'https://api.example.com/v1' },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const credentials = { email: 'reset-user@example.com', password: 'not-a-real-password' };

const mockFetchResponse = (status: number, body: unknown) => {
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
};

describe('authService.signInUser', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    globalThis.fetch = jest.fn();
    (SecureStore.setItemAsync as jest.Mock).mockClear();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    const logged = [logSpy, errorSpy, warnSpy]
      .flatMap((spy) => spy.mock.calls)
      .map((args) => JSON.stringify(args))
      .join('\n');
    expect(logged).not.toContain(credentials.password);
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('POSTs email and password to /auth/login on the main gateway', async () => {
    mockFetchResponse(401, { error: 'Authentication Failed', message: 'Invalid email or password' });

    await expect(authService.signInUser(credentials)).rejects.toBeDefined();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      }),
    );
  });

  it('maps 403 PASSWORD_RESET_REQUIRED to PasswordResetRequiredException', async () => {
    mockFetchResponse(403, {
      error: 'PASSWORD_RESET_REQUIRED',
      message: 'Your password must be reset. Check your email for a code.',
    });

    await expect(authService.signInUser(credentials)).rejects.toEqual({
      code: 'PasswordResetRequiredException',
      message: expect.stringMatching(/password must be reset.*code we emailed/i),
    });
  });

  it('maps 401 to "Invalid email or password"', async () => {
    mockFetchResponse(401, { error: 'Authentication Failed', message: 'Invalid email or password' });

    await expect(authService.signInUser(credentials)).rejects.toEqual({
      code: 'NotAuthorizedException',
      message: 'Invalid email or password',
    });
  });

  it('maps 403 USER_NOT_CONFIRMED and 429', async () => {
    mockFetchResponse(403, { error: 'USER_NOT_CONFIRMED', message: 'Not confirmed' });
    await expect(authService.signInUser(credentials)).rejects.toMatchObject({
      code: 'UserNotConfirmedException',
    });

    mockFetchResponse(429, { message: 'Too many requests' });
    await expect(authService.signInUser(credentials)).rejects.toMatchObject({
      code: 'LimitExceededException',
    });
  });

  it('maps a network failure to NetworkError', async () => {
    (globalThis.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(authService.signInUser(credentials)).rejects.toEqual({
      code: 'NetworkError',
      message: 'Network error. Please check your connection',
    });
  });

  it('stores the three tokens and the expiry, and returns the backend userId', async () => {
    const before = Date.now();
    mockFetchResponse(200, {
      message: 'Login successful',
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      idToken: 'test-id',
      expiresIn: 3600,
      user: {
        userId: 'user_test-1',
        email: credentials.email,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    const result = await authService.signInUser(credentials);

    expect(result.user.id).toBe('user_test-1');
    expect(result.user.name).toBe('Test User');
    expect(result.tokens).toEqual({
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      idToken: 'test-id',
    });

    const stored = new Map(
      (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([k, v]) => [k, v]),
    );
    expect(stored.get(STORAGE_KEYS.ACCESS_TOKEN)).toBe('test-access');
    expect(stored.get(STORAGE_KEYS.REFRESH_TOKEN)).toBe('test-refresh');
    expect(stored.get(STORAGE_KEYS.ID_TOKEN)).toBe('test-id');
    const expiresAt = Number(stored.get(STORAGE_KEYS.EXPIRES_AT));
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000);
    expect(JSON.parse(stored.get(STORAGE_KEYS.USER_DATA) as string)).toMatchObject({
      id: 'user_test-1',
      email: credentials.email,
      authProvider: 'cognito',
    });
  });
});

describe('authService session state', () => {
  const stored: Record<string, string> = {};

  beforeEach(() => {
    globalThis.fetch = jest.fn();
    Object.keys(stored).forEach((k) => delete stored[k]);
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) =>
      Promise.resolve(stored[k] ?? null),
    );
  });

  afterEach(() => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(() => Promise.resolve(null));
  });

  it('isAuthenticated is true only with an ID token that has not expired', async () => {
    expect(await authService.isAuthenticated()).toBe(false);

    stored[STORAGE_KEYS.ID_TOKEN] = 'test-id';
    stored[STORAGE_KEYS.EXPIRES_AT] = String(Date.now() + 60_000);
    expect(await authService.isAuthenticated()).toBe(true);

    stored[STORAGE_KEYS.EXPIRES_AT] = String(Date.now() - 1);
    expect(await authService.isAuthenticated()).toBe(false);
  });

  it('refreshTokens returns the stored tokens while more than 5 minutes remain', async () => {
    stored[STORAGE_KEYS.ACCESS_TOKEN] = 'test-access';
    stored[STORAGE_KEYS.REFRESH_TOKEN] = 'test-refresh';
    stored[STORAGE_KEYS.ID_TOKEN] = 'test-id';
    stored[STORAGE_KEYS.EXPIRES_AT] = String(Date.now() + 30 * 60_000);

    await expect(authService.refreshTokens()).resolves.toEqual({
      accessToken: 'test-access',
      refreshToken: 'test-refresh',
      idToken: 'test-id',
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('refreshTokens POSTs /auth/refresh near expiry and throws when it fails', async () => {
    stored[STORAGE_KEYS.ACCESS_TOKEN] = 'test-access';
    stored[STORAGE_KEYS.REFRESH_TOKEN] = 'test-refresh';
    stored[STORAGE_KEYS.ID_TOKEN] = 'test-id';
    stored[STORAGE_KEYS.EXPIRES_AT] = String(Date.now() + 60_000);
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not Found' }),
    });

    await expect(authService.refreshTokens()).rejects.toMatchObject({ code: 'SessionExpired' });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'test-refresh' }),
      }),
    );
  });
});
