import React, { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { StyleSheet, View, ActivityIndicator } from "react-native";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { CurrencyProvider } from "./src/contexts/CurrencyContext";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import RootNavigator from "@/navigation/RootNavigator";
import { NotificationService } from "./src/services/notification";
import { handleNotificationNavigation } from "./src/utils/notificationNavigation";
import { initializeOfflineStorage } from "./src/services/offline";
import { initializeApiClient, getApiClient } from "./src/services/api";
import { syncService } from "./src/services/syncService";

// Import Amplify configuration
import "./src/config/amplify";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

/**
 * Main App Navigation Component
 *
 * Handles authentication state and renders appropriate navigator
 */
const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const notificationServiceRef = useRef<NotificationService | null>(null);

  // Initialize notification service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const initializeNotifications = async () => {
        try {
          const apiClient = getApiClient();

          // Create notification service instance
          notificationServiceRef.current = new NotificationService(apiClient);

          // Setup notification handlers with navigation callback
          notificationServiceRef.current.setupNotificationHandlers((data) => {
            if (navigationRef.current) {
              handleNotificationNavigation(navigationRef.current, data);
            }
          });

          // Register device for push notifications
          const result = await notificationServiceRef.current.registerDevice(
            user.userId,
          );

          if (result.success) {
            console.log("✅ Device registered for push notifications");
          } else {
            console.log("⚠️  Failed to register device for push notifications");
          }
        } catch (error) {
          console.error("❌ Failed to initialize notification service:", error);
        }
      };

      initializeNotifications();

      // Initialize sync service for authenticated users
      syncService.initialize().catch((error) => {
        console.error("Failed to initialize sync service:", error);
      });

      // Cleanup on unmount or logout
      return () => {
        if (notificationServiceRef.current) {
          notificationServiceRef.current.cleanup();
          notificationServiceRef.current = null;
        }
        syncService.cleanup();
      };
    }
  }, [isAuthenticated, user]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Render appropriate navigator based on authentication state
  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <RootNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

/**
 * Root App Component with Providers
 */
export default function App() {
  // Initialize offline storage and API client on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("Initializing BudgetBuddy mobile app...");

        // Initialize API client with network monitoring
        initializeApiClient();

        // Initialize offline storage
        await initializeOfflineStorage();

        console.log("App initialization complete");
      } catch (error) {
        console.error("Failed to initialize app:", error);
      }
    };

    initializeApp();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
});
