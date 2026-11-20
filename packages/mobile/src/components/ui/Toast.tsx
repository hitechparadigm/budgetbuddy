/**
 * Toast
 *
 * A minimal transient message. There was no toast primitive in the mobile app,
 * so events the user needs to know about but should not be interrupted by
 * (a sync conflict overwriting a local edit) had nowhere to surface.
 *
 * `ToastHost` is mounted once near the root and listens for resolved sync
 * conflicts.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Pressable } from 'react-native';
import { syncService, type SyncConflict } from '../../services/syncService';

export interface ToastProps {
  message: string;
  /** Milliseconds before auto-dismiss. */
  duration?: number;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 4000,
  onDismiss,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  // The dismiss callback is read through a ref so it can stay out of the
  // timer effect's dependency array. ToastHost builds a fresh closure per
  // render, so depending on it directly restarted the countdown of every
  // mounted toast each time the host re-rendered - a second conflict
  // arriving reset the first toast's clock.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => onDismissRef.current?.());
    }, duration);

    return () => clearTimeout(timer);
    // onDismiss is intentionally absent - see onDismissRef above.
  }, [duration, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text style={styles.dismiss}>Dismiss</Text>
      </Pressable>
    </Animated.View>
  );
};

/** What the user sees when a conflict overwrote their local change. */
export function conflictMessage(conflict: SyncConflict): string {
  const noun =
    conflict.entity === 'budgets'
      ? 'budget'
      : conflict.entity === 'transactions'
        ? 'transaction'
        : 'category';

  return conflict.strategy === 'client_wins'
    ? `Your offline ${noun} change was kept instead of the server version.`
    : `A ${noun} you changed offline was updated elsewhere. The server version was kept.`;
}

interface QueuedToast {
  key: string;
  message: string;
}

/**
 * Mount once near the app root. Shows a toast for each sync conflict the
 * SyncService resolves.
 */
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextKey = useRef(0);

  const dismiss = useCallback((key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key));
  }, []);

  useEffect(() => {
    const unsubscribe = syncService.addConflictListener(conflict => {
      const key = `conflict-${nextKey.current++}`;
      // Cap the stack so a sync resolving many conflicts cannot bury the UI.
      setToasts(prev =>
        [...prev, { key, message: conflictMessage(conflict) }].slice(-3),
      );
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {toasts.map(toast => (
        <Toast
          key={toast.key}
          message={toast.message}
          onDismiss={() => dismiss(toast.key)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  message: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 14,
  },
  dismiss: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default Toast;
