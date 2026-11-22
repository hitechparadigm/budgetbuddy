/**
 * Password reset service
 *
 * Calls the same unauthenticated routes on the main gateway the web app uses
 * (packages/web-app/src/components/auth/LoginForm.tsx):
 *   POST /auth/forgot-password          { email }
 *   POST /auth/confirm-forgot-password  { email, code, newPassword }
 *
 * These requests carry no auth token, so they use fetch directly rather than
 * the shared `apiRequest` helper (which attaches a token and an offline cache).
 * The base URL is the main gateway from config/api (the value behind
 * API_CONFIG.baseURL). Nothing here logs the email, code, password or body.
 */
import { apiBaseUrl } from '../config/api';

const NETWORK_ERROR = 'Network error. Please check your connection';

async function postJson(
  path: string,
  body: Record<string, string>,
  fallback: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // The backend returns user-safe messages for 400s (invalid code, weak password).
    throw new Error((data && data.message) || fallback);
  }
}

/** Ask the backend to email a password reset code. */
export async function requestPasswordReset(email: string): Promise<void> {
  await postJson('/auth/forgot-password', { email: email.trim() }, 'Failed to send reset code');
}

/** Set a new password with the emailed reset code. */
export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await postJson(
    '/auth/confirm-forgot-password',
    { email: email.trim(), code: code.trim(), newPassword },
    'Failed to reset password',
  );
}
