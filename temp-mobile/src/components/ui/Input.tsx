import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  variant = 'outlined',
  size = 'medium',
  secureTextEntry,
  ...props
}: InputProps) {
  const [isSecureTextVisible, setIsSecureTextVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPasswordField = secureTextEntry;
  const actualSecureTextEntry = isPasswordField && !isSecureTextVisible;

  const handleToggleSecureText = () => {
    setIsSecureTextVisible(!isSecureTextVisible);
  };

  const inputContainerStyle = [
    styles.inputContainer,
    styles[variant],
    styles[size],
    isFocused && styles.focused,
    error && styles.error,
    props.editable === false && styles.disabled,
  ];

  const textInputStyle = [
    styles.input,
    styles[`${size}Input`],
    leftIcon && styles.inputWithLeftIcon,
    (rightIcon || isPasswordField) && styles.inputWithRightIcon,
    inputStyle,
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, styles[`${size}Label`], labelStyle]}>
          {label}
        </Text>
      )}

      <View style={inputContainerStyle}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? '#10b981' : '#6b7280'}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...props}
          style={textInputStyle}
          secureTextEntry={actualSecureTextEntry}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#9ca3af"
        />

        {isPasswordField && (
          <TouchableOpacity
            onPress={handleToggleSecureText}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSecureTextVisible ? 'eye-off' : 'eye'}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPasswordField && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={isFocused ? '#10b981' : '#6b7280'}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },

  label: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  smallLabel: {
    fontSize: 12,
  },
  mediumLabel: {
    fontSize: 14,
  },
  largeLabel: {
    fontSize: 16,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },

  // Variants
  default: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: 'transparent',
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  filled: {
    backgroundColor: '#f3f4f6',
    borderWidth: 0,
  },

  // Sizes
  small: {
    minHeight: 36,
    paddingHorizontal: 12,
  },
  medium: {
    minHeight: 44,
    paddingHorizontal: 16,
  },
  large: {
    minHeight: 52,
    paddingHorizontal: 20,
  },

  // States
  focused: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  error: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  disabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },

  input: {
    flex: 1,
    color: '#1f2937',
    fontSize: 16,
  },
  smallInput: {
    fontSize: 14,
  },
  mediumInput: {
    fontSize: 16,
  },
  largeInput: {
    fontSize: 18,
  },

  inputWithLeftIcon: {
    marginLeft: 8,
  },
  inputWithRightIcon: {
    marginRight: 8,
  },

  leftIcon: {
    marginLeft: 4,
  },
  rightIcon: {
    marginRight: 4,
    padding: 4,
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
});
