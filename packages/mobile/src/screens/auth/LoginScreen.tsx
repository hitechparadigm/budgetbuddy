/**
 * Login Screen for React Native
 *
 * Mobile-optimized login interface with email/password authentication,
 * MFA challenge handling, and navigation to registration and password reset flows.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { AuthError } from "../../services/auth";
import { AuthScreenProps } from "../../navigation/AuthNavigator";
import { GoogleSignInButton } from "../../components/GoogleSignInButton";
import TwoFactorVerify from "../../components/TwoFactorVerify";

type LoginScreenProps = AuthScreenProps<"Login">;

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const {
    signIn,
    isLoading,
    mfaChallenge,
    verifyMFA,
    verifyMFAWithBackupCode,
    cancelMFAChallenge,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Show MFA modal when challenge is present
  useEffect(() => {
    if (mfaChallenge) {
      setShowMFAModal(true);
    } else {
      setShowMFAModal(false);
    }
  }, [mfaChallenge]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle login form submission
   */
  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      await signIn({ email: email.trim(), password });
      // Navigation will be handled by the auth state change
      // If MFA is required, mfaChallenge will be set and modal will show
    } catch (error) {
      const authError = error as AuthError;

      // Handle specific error cases
      if (authError.code === "UserNotConfirmedException") {
        Alert.alert(
          "Email Verification Required",
          "Please verify your email address before signing in.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Verify Email",
              onPress: () => navigation.navigate("ConfirmSignUp", { email }),
            },
          ],
        );
      } else {
        Alert.alert("Login Failed", authError.message);
      }
    }
  };

  /**
   * Handle MFA verification
   */
  const handleMFAVerify = async (code: string): Promise<void> => {
    try {
      if (useBackupCode) {
        await verifyMFAWithBackupCode(code);
      } else {
        await verifyMFA(code);
      }
      // Success - auth state will update and navigate automatically
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert(
        "Verification Failed",
        authError.message || "Invalid code. Please try again.",
      );
    }
  };

  /**
   * Handle MFA cancellation
   */
  const handleMFACancel = (): void => {
    cancelMFAChallenge();
    setShowMFAModal(false);
    setUseBackupCode(false);
  };

  /**
   * Toggle between TOTP and backup code
   */
  const handleUseBackupCode = (): void => {
    setUseBackupCode(!useBackupCode);
  };

  /**
   * Navigate to registration screen
   */
  const handleSignUpPress = (): void => {
    navigation.navigate("Register");
  };

  /**
   * Navigate to forgot password screen
   */
  const handleForgotPasswordPress = (): void => {
    navigation.navigate("ForgotPassword");
  };

  /**
   * Handle Google Sign-In
   */
  const handleGoogleSignIn = async (): Promise<void> => {
    setGoogleLoading(true);
    try {
      // TODO: Implement Google Sign-In integration
      // This will call authService.signInWithGoogle() and handle the response
      Alert.alert("Coming Soon", "Google Sign-In will be available soon");
    } catch (error) {
      const authError = error as AuthError;
      Alert.alert("Google Sign-In Failed", authError.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to your BudgetBuddy account
            </Text>
          </View>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    errors.password ? styles.inputError : null,
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.showPasswordButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPasswordPress}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Google Sign-In Button */}
            <GoogleSignInButton
              onPress={handleGoogleSignIn}
              loading={googleLoading}
              disabled={isLoading || googleLoading}
              variant="signin"
            />

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={handleSignUpPress}
                disabled={isLoading}
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MFA Verification Modal */}
      <Modal
        visible={showMFAModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleMFACancel}
      >
        <SafeAreaView style={styles.mfaContainer}>
          <View style={styles.mfaHeader}>
            <TouchableOpacity
              onPress={handleMFACancel}
              style={styles.mfaCancelButton}
            >
              <Text style={styles.mfaCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.mfaTitle}>Two-Factor Authentication</Text>
            <View style={styles.mfaCancelButton} />
          </View>

          <View style={styles.mfaContent}>
            <Text style={styles.mfaSubtitle}>
              {useBackupCode
                ? "Enter one of your backup codes"
                : "Enter the 6-digit code from your authenticator app"}
            </Text>

            <TwoFactorVerify
              onVerify={handleMFAVerify}
              onCancel={handleMFACancel}
              isLoading={isLoading}
              isBackupCode={useBackupCode}
            />

            <TouchableOpacity
              onPress={handleUseBackupCode}
              style={styles.backupCodeToggle}
            >
              <Text style={styles.backupCodeToggleText}>
                {useBackupCode
                  ? "Use authenticator app instead"
                  : "Use a backup code instead"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
  },
  inputError: {
    borderColor: "#e74c3c",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1a1a1a",
    borderWidth: 0,
  },
  showPasswordButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  showPasswordText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  loginButtonDisabled: {
    backgroundColor: "#ccc",
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#999",
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 16,
    color: "#666",
  },
  signUpLink: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  // MFA Modal styles
  mfaContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  mfaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  mfaCancelButton: {
    width: 60,
  },
  mfaCancelText: {
    color: "#007AFF",
    fontSize: 16,
  },
  mfaTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  mfaContent: {
    flex: 1,
    padding: 24,
    alignItems: "center",
  },
  mfaSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  backupCodeToggle: {
    marginTop: 24,
    padding: 12,
  },
  backupCodeToggleText: {
    color: "#007AFF",
    fontSize: 16,
  },
});

export default LoginScreen;
