/**
 * authService.signInUser: an admin-forced password reset must surface as a clear
 * PasswordResetRequiredException, not the generic "Sign in failed".
 */

import { signIn } from 'aws-amplify/auth';
import { authService } from './auth';

jest.mock('aws-amplify/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchAuthSession: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const credentials = { email: 'reset-user@example.com', password: 'not-a-real-password' };

describe('authService.signInUser reset-required handling', () => {
  beforeEach(() => {
    (signIn as jest.Mock).mockReset();
  });

  it('maps the Amplify RESET_PASSWORD step to PasswordResetRequiredException', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({
      isSignedIn: false,
      nextStep: { signInStep: 'RESET_PASSWORD' },
    });

    await expect(authService.signInUser(credentials)).rejects.toEqual({
      code: 'PasswordResetRequiredException',
      message: expect.stringMatching(/password must be reset.*forgot your password/i),
    });
  });

  it('keeps the generic failure for other incomplete sign-in steps', async () => {
    (signIn as jest.Mock).mockResolvedValueOnce({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
    });

    await expect(authService.signInUser(credentials)).rejects.toMatchObject({
      message: 'Sign in failed',
    });
  });
});
