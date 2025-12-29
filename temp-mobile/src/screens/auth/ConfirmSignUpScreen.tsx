/**
 * Email Confirmation Screen for React Native
 *
 * Handles email verification after user registration with
 * code input and resend functionality.
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../services/auth';
import { AuthScreenProps } from '../../navigation/AuthNavigator';

type ConfirmSignUpScreenProps = AuthScreenProps<'ConfirmSignUp'>;

export const ConfirmSignUpScreen: React.FC<ConfirmSignUpScreenProps> = ({
  navigation,
  route
}) => {
  const { confirmSignUp, resendConfirmationCode, isLoading } = useAuth();
  const { email } = route.params;

  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState('');

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  /**
   * Handle confirmation code submission
   */
  const handleConfirmCode = async (): Promise<void> => {
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (code.trim().length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    try {
      setError('');
      await confirmSignUp(email, code.trim());

      Alert.alert(
        'Email Verified!',
        'Your email has been verified successfully. You can now sign in.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
    }
  };

  /**
   * Handle resend confirmation code
   */
  const handleResendCode = async (): Promise<void> => {
    if (resendCooldown > 0) {
      return;
    }

    try {
      setIsResending(true);
      setError('');
      await resendConfirmationCode(email);

      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your email.'
      );

      // Start cooldown timer
      setResendCooldown(60);
    } catch (error) {
      const authError = error as AuthError;
      setError(authError.message);
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Navigate back to registration
   */
  const handleBackToRegister = (): void => {
    navigation.navigate('Register');
  };

  /**
   * Format code input (add spaces for readability)
   */
  const formatCode = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    // Limit to 6 digits
    const limited = digits.slice(0, 6);
    // Add spaces every 3 digits
    return limited.replace(/(\d{3})(\d{1,3})/, '$1 $2');
  };

  /**
   * Handle code input change
   */
  const handleCodeChange = (input: string): void => {
    const formatted = formatCode(input);
    setCode(formatted);

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification code to{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            {/* Verification Code Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={[styles.codeInput, error ? styles.inputError : null]}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="000 000"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={7} // 6 digits + 1 space
                editable={!isLoading}
                textAlign="center"
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
              onPress={handleConfirmCode}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            {/* Resend Code */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isResending || resendCooldown > 0 || isLoading}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (isResending || resendCooldown > 0 || isLoading) && styles.resendLinkDisabled,
                  ]}
                >
                  {isResending
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Back to Register */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToRegister}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back to Registration</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: '#007AFF',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 24,
    color: '#1a1a1a',
    fontWeight: '600',
    letterSpacing: 4,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  resendText: {
    fontSize: 16,
    color: '#666',
  },
  resendLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendLinkDisabled: {
    color: '#ccc',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default ConfirmSignUpScreen;
