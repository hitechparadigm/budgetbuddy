/**
 * Tips Screen - Financial Tips Feed
 *
 * Displays personalized financial tips with swipe gestures:
 * - Swipe left to save
 * - Swipe right to dismiss
 * - Pull to refresh
 * - Read/unread tracking
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../contexts/AuthContext";
import SwipeableTipCard from "../components/SwipeableTipCard";
import { LoadingSpinner } from "../components/ui";

const API_BASE_URL =
  "https://q0zoob6728.execute-api.us-east-1.amazonaws.com/v1";
const TIPS_STORAGE_KEY = "@budgetbuddy_tips_state";

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
  difficulty?: string;
  isRead?: boolean;
  isSaved?: boolean;
}

interface TipsState {
  readTips: string[];
  savedTips: string[];
  dismissedTips: string[];
}

export default function TipsScreen() {
  const { colors } = useTheme();
  const { tokens } = useAuth();

  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipsState, setTipsState] = useState<TipsState>({
    readTips: [],
    savedTips: [],
    dismissedTips: [],
  });
  const [showSaved, setShowSaved] = useState(false);

  // Load tips state from AsyncStorage
  const loadTipsState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(TIPS_STORAGE_KEY);
      if (stored) {
        setTipsState(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading tips state:", err);
    }
  }, []);

  // Save tips state to AsyncStorage
  const saveTipsState = useCallback(async (newState: TipsState) => {
    try {
      await AsyncStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify(newState));
      setTipsState(newState);
    } catch (err) {
      console.error("Error saving tips state:", err);
    }
  }, []);

  // Load tips from API
  const loadTips = useCallback(async () => {
    try {
      setError(null);

      if (!tokens?.idToken) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/tips`, {
        headers: {
          Authorization: `Bearer ${tokens.idToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load tips");
      }

      const data = await response.json();
      const tipsData = data.data?.tips || data.tips || [];
      setTips(tipsData);
    } catch (err) {
      console.error("Error loading tips:", err);
      setError(err instanceof Error ? err.message : "Failed to load tips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tokens]);

  useEffect(() => {
    loadTipsState();
    loadTips();
  }, [loadTipsState, loadTips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadTips();
  }, [loadTips]);

  const handleSaveTip = useCallback(
    (tipId: string) => {
      const newState = {
        ...tipsState,
        savedTips: [...tipsState.savedTips, tipId],
      };
      saveTipsState(newState);
    },
    [tipsState, saveTipsState],
  );

  const handleDismissTip = useCallback(
    (tipId: string) => {
      const newState = {
        ...tipsState,
        dismissedTips: [...tipsState.dismissedTips, tipId],
      };
      saveTipsState(newState);
    },
    [tipsState, saveTipsState],
  );

  const handleUnsaveTip = useCallback(
    (tipId: string) => {
      const newState = {
        ...tipsState,
        savedTips: tipsState.savedTips.filter((id) => id !== tipId),
      };
      saveTipsState(newState);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [tipsState, saveTipsState],
  );

  const handleTipPress = useCallback(
    (tip: Tip) => {
      // Mark as read
      if (!tipsState.readTips.includes(tip.id)) {
        const newState = {
          ...tipsState,
          readTips: [...tipsState.readTips, tip.id],
        };
        saveTipsState(newState);
      }

      // Show tip details
      Alert.alert(tip.title, tip.content, [{ text: "Got it!" }]);
    },
    [tipsState, saveTipsState],
  );

  // Filter tips based on view mode
  const displayedTips = tips
    .filter((tip) => {
      if (showSaved) {
        return tipsState.savedTips.includes(tip.id);
      }
      return !tipsState.dismissedTips.includes(tip.id);
    })
    .map((tip) => ({
      ...tip,
      isRead: tipsState.readTips.includes(tip.id),
      isSaved: tipsState.savedTips.includes(tip.id),
    }));

  const unreadCount = tips.filter(
    (tip) =>
      !tipsState.readTips.includes(tip.id) &&
      !tipsState.dismissedTips.includes(tip.id),
  ).length;

  const renderTip = useCallback(
    ({ item }: { item: Tip }) => {
      if (showSaved) {
        // In saved view, show regular card with unsave option
        return (
          <Pressable
            style={[styles.savedCard, { backgroundColor: colors.surface }]}
            onPress={() => handleTipPress(item)}
            onLongPress={() => {
              Alert.alert(
                "Remove from Saved",
                "Do you want to remove this tip from your saved list?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => handleUnsaveTip(item.id),
                  },
                ],
              );
            }}
          >
            <View style={styles.savedHeader}>
              <Text style={styles.savedIcon}>
                {item.category === "budgeting"
                  ? "💰"
                  : item.category === "saving"
                    ? "🏦"
                    : item.category === "debt"
                      ? "💳"
                      : item.category === "investing"
                        ? "📈"
                        : "💡"}
              </Text>
              <Text
                style={[styles.savedCategory, { color: colors.textSecondary }]}
              >
                {item.category}
              </Text>
              <Ionicons name="bookmark" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.savedTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text
              style={[styles.savedContent, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.content}
            </Text>
          </Pressable>
        );
      }

      return (
        <SwipeableTipCard
          tip={item}
          onSave={handleSaveTip}
          onDismiss={handleDismissTip}
          onPress={handleTipPress}
        />
      );
    },
    [
      showSaved,
      colors,
      handleSaveTip,
      handleDismissTip,
      handleTipPress,
      handleUnsaveTip,
    ],
  );

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>💡 Tips</Text>
            {unreadCount > 0 && !showSaved && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSaved(!showSaved);
            }}
            style={[
              styles.toggleButton,
              showSaved && { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Ionicons
              name={showSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={showSaved ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.toggleText,
                { color: showSaved ? colors.primary : colors.textSecondary },
              ]}
            >
              {showSaved ? "Saved" : "All"}
            </Text>
          </Pressable>
        </View>

        {/* Swipe hint */}
        {!showSaved && displayedTips.length > 0 && (
          <View style={styles.hintContainer}>
            <Ionicons
              name="swap-horizontal"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Swipe left to save, right to dismiss
            </Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View
            style={[
              styles.errorContainer,
              { backgroundColor: colors.error + "15" },
            ]}
          >
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Tips List */}
        {displayedTips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{showSaved ? "📚" : "💡"}</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {showSaved ? "No saved tips" : "No tips available"}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {showSaved
                ? "Swipe left on tips to save them for later"
                : "Pull down to refresh and get new tips"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedTips}
            renderItem={renderTip}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 12,
  },
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  savedCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  savedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  savedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  savedCategory: {
    flex: 1,
    fontSize: 12,
    textTransform: "capitalize",
  },
  savedTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  savedContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
