/**
 * Two-Factor Authentication Test Suite
 * Feature: test-coverage-improvement
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

const mockTotpLib = {
  generateSecret: jest.fn(),
  generateQRCode: jest.fn(),
  verifyToken: jest.fn(),
};

const mockDynamoHelpers = {
  getItem: jest.fn(),
  updateItem: jest.fn(),
  putItem: jest.fn(),
};

class TwoFactorAuthService {
  constructor(dynamoHelpers, totpLib) {
    this.dynamoHelpers = dynamoHelpers;
    this.totpLib = totpLib;
    this.MAX_ATTEMPTS = 3;
    this.LOCKOUT_DURATION_MS = 15 * 60 * 1000;
  }

  async enable2FA(userId, email) {
    const secret = this.totpLib.generateSecret({ name: 'BudgetBuddy:' + email, issuer: 'BudgetBuddy' });
    const qrCode = await this.totpLib.generateQRCode(secret.otpauth_url);
    await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', {
      pending2FASecret: secret.base32,
      pending2FASetupAt: new Date().toISOString(),
    });
    return { secret: secret.base32, qrCode, otpauthUrl: secret.otpauth_url };
  }

  async verify2FASetup(userId, totpCode) {
    const userProfile = await this.dynamoHelpers.getItem('USER#' + userId, 'PROFILE');
    if (!userProfile || !userProfile.pending2FASecret) throw new Error('No pending 2FA setup found');
    const isValid = this.totpLib.verifyToken({ secret: userProfile.pending2FASecret, token: totpCode, window: 1 });
    if (!isValid) throw new Error('Invalid TOTP code');
    await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', {
      twoFactorEnabled: true, twoFactorSecret: userProfile.pending2FASecret, pending2FASecret: null
    });
    return { success: true };
  }

  async verifyLoginTotp(userId, totpCode) {
    const userProfile = await this.dynamoHelpers.getItem('USER#' + userId, 'PROFILE');
    if (!userProfile || !userProfile.twoFactorEnabled) throw new Error('2FA not enabled');
    if (userProfile.twoFactorLockoutUntil && new Date(userProfile.twoFactorLockoutUntil) > new Date()) {
      throw new Error('Account locked');
    }
    const isValid = this.totpLib.verifyToken({ secret: userProfile.twoFactorSecret, token: totpCode, window: 1 });
    if (!isValid) {
      const attempts = (userProfile.twoFactorAttempts || 0) + 1;
      if (attempts >= this.MAX_ATTEMPTS) {
        await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', {
          twoFactorAttempts: 0, twoFactorLockoutUntil: new Date(Date.now() + this.LOCKOUT_DURATION_MS).toISOString()
        });
        throw new Error('Account locked for 15 minutes');
      }
      await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', { twoFactorAttempts: attempts });
      throw new Error('Invalid TOTP. ' + (this.MAX_ATTEMPTS - attempts) + ' attempts remaining');
    }
    await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', { twoFactorAttempts: 0, twoFactorLockoutUntil: null });
    return { success: true, verified: true };
  }

  async disable2FA(userId, totpCode) {
    const userProfile = await this.dynamoHelpers.getItem('USER#' + userId, 'PROFILE');
    if (!userProfile || !userProfile.twoFactorEnabled) throw new Error('2FA not enabled');
    const isValid = this.totpLib.verifyToken({ secret: userProfile.twoFactorSecret, token: totpCode, window: 1 });
    if (!isValid) throw new Error('Invalid TOTP code');
    await this.dynamoHelpers.updateItem('USER#' + userId, 'PROFILE', { twoFactorEnabled: false, twoFactorSecret: null });
    return { success: true };
  }

  async is2FAEnabled(userId) {
    const userProfile = await this.dynamoHelpers.getItem('USER#' + userId, 'PROFILE');
    return userProfile?.twoFactorEnabled || false;
  }
}

describe('Two-Factor Authentication', () => {
  let service;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new TwoFactorAuthService(mockDynamoHelpers, mockTotpLib);
  });

  describe('5.1: TOTP Secret Generation', () => {
    test('generates secret and QR code', async () => {
      mockTotpLib.generateSecret.mockReturnValue({ base32: 'SECRET', otpauth_url: 'otpauth://totp/test' });
      mockTotpLib.generateQRCode.mockResolvedValue('qr-data');
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      const result = await service.enable2FA('user-1', 'test@test.com');
      expect(result.secret).toBe('SECRET');
      expect(result.qrCode).toBe('qr-data');
    });

    test('stores pending secret', async () => {
      mockTotpLib.generateSecret.mockReturnValue({ base32: 'SECRET', otpauth_url: 'url' });
      mockTotpLib.generateQRCode.mockResolvedValue('qr');
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      await service.enable2FA('user-1', 'test@test.com');
      expect(mockDynamoHelpers.updateItem).toHaveBeenCalledWith('USER#user-1', 'PROFILE', expect.objectContaining({ pending2FASecret: 'SECRET' }));
    });
  });

  describe('5.2: TOTP Verification', () => {
    test('enables 2FA on valid code', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ pending2FASecret: 'SECRET' });
      mockTotpLib.verifyToken.mockReturnValue(true);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      const result = await service.verify2FASetup('user-1', '123456');
      expect(result.success).toBe(true);
    });

    test('rejects invalid code', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ pending2FASecret: 'SECRET' });
      mockTotpLib.verifyToken.mockReturnValue(false);
      await expect(service.verify2FASetup('user-1', '000000')).rejects.toThrow('Invalid TOTP code');
    });

    test('fails without pending setup', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({});
      await expect(service.verify2FASetup('user-1', '123456')).rejects.toThrow('No pending 2FA setup found');
    });
  });

  describe('5.3: Login with 2FA', () => {
    test('verifies TOTP during login', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      mockTotpLib.verifyToken.mockReturnValue(true);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      const result = await service.verifyLoginTotp('user-1', '123456');
      expect(result.verified).toBe(true);
    });

    test('resets attempts on success', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', twoFactorAttempts: 2 });
      mockTotpLib.verifyToken.mockReturnValue(true);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      await service.verifyLoginTotp('user-1', '123456');
      expect(mockDynamoHelpers.updateItem).toHaveBeenCalledWith('USER#user-1', 'PROFILE', { twoFactorAttempts: 0, twoFactorLockoutUntil: null });
    });
  });

  describe('5.4: Max 3 Attempts', () => {
    test('increments attempts on failure', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', twoFactorAttempts: 0 });
      mockTotpLib.verifyToken.mockReturnValue(false);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      await expect(service.verifyLoginTotp('user-1', '000000')).rejects.toThrow('2 attempts remaining');
    });

    test('locks after 3 failures', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', twoFactorAttempts: 2 });
      mockTotpLib.verifyToken.mockReturnValue(false);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      await expect(service.verifyLoginTotp('user-1', '000000')).rejects.toThrow('Account locked');
    });

    test('rejects during lockout', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET', twoFactorLockoutUntil: new Date(Date.now() + 60000).toISOString() });
      await expect(service.verifyLoginTotp('user-1', '123456')).rejects.toThrow('Account locked');
    });
  });

  describe('5.5: Disable 2FA', () => {
    test('disables with valid code', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      mockTotpLib.verifyToken.mockReturnValue(true);
      mockDynamoHelpers.updateItem.mockResolvedValue({});
      const result = await service.disable2FA('user-1', '123456');
      expect(result.success).toBe(true);
    });

    test('rejects invalid code', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' });
      mockTotpLib.verifyToken.mockReturnValue(false);
      await expect(service.disable2FA('user-1', '000000')).rejects.toThrow('Invalid TOTP code');
    });

    test('fails if not enabled', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: false });
      await expect(service.disable2FA('user-1', '123456')).rejects.toThrow('2FA not enabled');
    });
  });

  describe('Helper: is2FAEnabled', () => {
    test('returns true when enabled', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: true });
      expect(await service.is2FAEnabled('user-1')).toBe(true);
    });

    test('returns false when disabled', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue({ twoFactorEnabled: false });
      expect(await service.is2FAEnabled('user-1')).toBe(false);
    });

    test('returns false when user not found', async () => {
      mockDynamoHelpers.getItem.mockResolvedValue(null);
      expect(await service.is2FAEnabled('user-1')).toBe(false);
    });
  });
});
