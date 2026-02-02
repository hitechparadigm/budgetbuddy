/**
 * useGoalReorder Hook
 * Handles goal reordering with optimistic updates and API persistence
 */

import { useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useHaptics } from "./useHaptics";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";

interface UseGoalReorderOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseGoalReorderReturn {
  reorderGoals: (goalIds: string[]) => Promise<void>;
  isReordering: boolean;
  error: string | null;
}

export function useGoalReorder(
  options: UseGoalReorderOptions = {}
): UseGoalReorderReturn {
  const { tokens } = useAuth();
  const haptics = useHaptics();
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorderGoals = useCallback(
    async (goalIds: string[]) => {
      if (!tokens?.idToken) {
        setError("Not authenticated");
        return;
      }

      setIsReordering(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/goals/reorder`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tokens.idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ goalIds }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to reorder goals");
        }

        haptics.success();
        options.onSuccess?.();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to reorder goals";
        setError(errorMessage);
        haptics.error();
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsReordering(false);
      }
    },
    [tokens, haptics, options]
  );

  return {
    reorderGoals,
    isReordering,
    error,
  };
}

export default useGoalReorder;
