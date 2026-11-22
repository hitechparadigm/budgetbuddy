/**
 * Forgot Password Screen for React Native
 *
 * Three steps, matching the web LoginForm's reset flow:
 *   email -> POST /auth/forgot-password (emails a code)
 *   code  -> POST /auth/confirm-forgot-password (sets the new password)
 *   done  -> back to sign in
 *
 * When sign-in returns PASSWORD_RESET_REQUIRED, LoginScreen opens this screen
 * with `resetRequired: true`; the backend has already sent a code, so the
 * screen starts on the code step without requesting another one.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthScreenProps } from "../../navigation/AuthNavigator";
import {
  requestPasswordReset,
  confirmPasswordReset,
} from "../../services/passwordReset";

type ForgotPasswordScreenProps = AuthScreenProps<"ForgotPassword">;
type Step = "email" | "code" | "done";

const MIN_PASSWORD_LENGTH = 8;

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
  route,
}) => {
  const resetRequired = route.params?.resetRequired === true;
  const [step, setStep] = useState<Step>(resetRequired ? "code" : "email");
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBanner, setShowBanner] = useState(resetRequired);

  const handleSendCode = async (): Promise<void> => {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setShowBanner(false);
      setStep("code");
    } catch (err) {
      setError(errorMessage(err, "Failed to send reset code"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    if (!code.trim() || !newPassword) {
      setError("Enter the code and a new password");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirmPasswordReset(email, code, newPassword);
      setCode("");
      setNewPassword("");
      setStep("done");
    } catch (err) {
      setError(errorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = (): void => {
    setError(null);
    setShowBanner(false);
    setCode("");
    setNewPassword("");
    setStep("email");
  };

  const renderButton = (label: string, onPress: () => void, testID: string) => (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === "email" && "We'll email you a code to reset your password"}
              {step === "code" && "Enter the code we emailed you and a new password"}
              {step === "done" && "All set"}
            </Text>
          </View>

          {showBanner && step === "code" && (
            <View style={styles.banner} testID="forgot-reset-required-banner">
              <Text style={styles.bannerText}>
                Your password must be reset. Enter the code we emailed you and
                choose a new password.
              </Text>
            </View>
          )}

          <View style={styles.form}>
            {step === "email" && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    testID="forgot-email-input"
                  />
                </View>
                {error && (
                  <Text style={styles.errorText} testID="forgot-error">
                    {error}
                  </Text>
                )}
                {renderButton("Send reset code", handleSendCode, "forgot-send-code")}
              </>
            )}

            {step === "code" && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Reset code</Text>
                  <TextInput
                    style={styles.input}
                    value={code}
                    onChangeText={setCode}
                    placeholder="Enter the code"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    editable={!loading}
                    testID="forgot-code-input"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New password</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor="#999"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    testID="forgot-new-password-input"
                  />
                </View>
                {error && (
                  <Text style={styles.errorText} testID="forgot-error">
                    {error}
                  </Text>
                )}
                {renderButton("Reset password", handleReset, "forgot-submit")}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleResend}
                  disabled={loading}
                  testID="forgot-resend-link"
                >
                  <Text style={styles.linkText}>Send a new code</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "done" && (
              <>
                <Text style={styles.doneText}>
                  Password reset. Sign in with your new password.
                </Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => navigation.navigate("Login")}
                  testID="forgot-done-signin"
                >
                  <Text style={styles.buttonText}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}

            {step !== "done" && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.linkText}>Back to sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  banner: {
    backgroundColor: "#fff7e6",
    borderColor: "#f5c26b",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  bannerText: {
    color: "#8a5a00",
    fontSize: 14,
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
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    padding: 8,
  },
  linkText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  doneText: {
    fontSize: 16,
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 24,
  },
});

export default ForgotPasswordScreen;
