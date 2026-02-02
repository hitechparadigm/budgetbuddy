/**
 * useHaptics Hook
 * Provides haptic feedback utilities for mobile interactions
 */

import * as Haptics from 'expo-haptics';

export interface UseHapticsReturn {
  /** Light impact - for subtle feedback like button taps */
  light: () => Promise<void>;
  /** Medium impact - for more noticeable feedback like selections */
  medium: () => Promise<void>;
  /** Heavy impact - for significant actions */
  heavy: () => Promise<void>;
  /** Success notification - for successful operations */
  success: () => Promise<void>;
  /** Error notification - for failed operations */
  error: () => Promise<void>;
  /** Warning notification - for warnings */
  warning: () => Promise<void>;
  /** Selection changed - for picker/selection changes */
  selection: () => Promise<void>;
}

/**
 * Hook for haptic feedback
 * Wraps expo-haptics with convenient methods
 */
export function useHaptics(): UseHapticsReturn {
  const light = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const medium = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const heavy = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const success = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const error = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const warning = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const selection = async () => {
    await Haptics.selectionAsync();
  };

  return {
    light,
    medium,
    heavy,
    success,
    error,
    warning,
    selection,
  };
}

export default useHaptics;
