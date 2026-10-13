/**
 * Biometric Authentication Service
 *
 * Thin wrapper around expo-local-authentication plus a persisted on/off
 * preference. This only gates local app unlock (Face ID / Touch ID /
 * fingerprint) - it is a device-level convenience layer in front of the
 * existing Cognito session already held in SecureStore (see services/auth.ts).
 * It is not a replacement for sign-in and does not change what the backend
 * considers an authenticated request.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'budgetbuddy_biometric_enabled';

export interface BiometricAvailability {
  /** Device has fingerprint/face hardware. */
  hasHardware: boolean;
  /** User has enrolled at least one biometric credential with the OS. */
  isEnrolled: boolean;
  /** hasHardware && isEnrolled && platform !== 'web'. */
  isAvailable: boolean;
  /** Human-readable label for the strongest enrolled method, for UI copy. */
  typeLabel: 'Face ID' | 'Touch ID' | 'Biometrics' | 'None';
}

/**
 * Checks device hardware + enrollment status. Safe to call on web (always
 * returns unavailable there - expo-local-authentication has no web backing).
 */
export async function getAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') {
    return { hasHardware: false, isEnrolled: false, isAvailable: false, typeLabel: 'None' };
  }

  const [hasHardware, isEnrolled, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  let typeLabel: BiometricAvailability['typeLabel'] = 'None';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    typeLabel = Platform.OS === 'ios' ? 'Face ID' : 'Biometrics';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    typeLabel = Platform.OS === 'ios' ? 'Touch ID' : 'Biometrics';
  }

  return {
    hasHardware,
    isEnrolled,
    isAvailable: hasHardware && isEnrolled,
    typeLabel,
  };
}

/**
 * Prompts the OS biometric sheet. Returns true only on a genuine success -
 * cancellation, lockout, and hardware errors all return false rather than
 * throwing, since callers treat "not authenticated" uniformly either way.
 */
export async function authenticate(promptMessage = 'Unlock BudgetBuddy'): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: false, // allow device PIN/passcode fallback
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch (error) {
    console.warn('Biometric authentication error:', error);
    return false;
  }
}

/** Reads the persisted user preference (default false - opt-in only). */
export async function isEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to read biometric preference:', error);
    return false;
  }
}

/**
 * Persists the user's on/off preference. Callers are responsible for
 * confirming device availability (getAvailability()) and, when turning the
 * setting on, a successful authenticate() call before calling this with
 * `true` - this function only stores the preference, it does not verify
 * biometrics itself.
 */
export async function setEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    console.warn('Failed to save biometric preference:', error);
  }
}