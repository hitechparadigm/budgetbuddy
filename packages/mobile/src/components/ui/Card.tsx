import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type CardPadding = 'none' | 'small' | 'medium' | 'large';
type CardMargin = 'none' | 'small' | 'medium' | 'large';

interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: CardPadding;
  margin?: CardMargin;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
  pressable?: boolean;
}

const paddingStyles: Record<CardPadding, ViewStyle> = {
  none: { padding: 0 },
  small: { padding: 12 },
  medium: { padding: 16 },
  large: { padding: 24 },
};

const marginStyles: Record<CardMargin, ViewStyle> = {
  none: { margin: 0 },
  small: { margin: 8 },
  medium: { margin: 16 },
  large: { margin: 24 },
};

export default function Card({
  children,
  variant = 'default',
  padding = 'medium',
  margin = 'none',
  style,
  hapticFeedback = true,
  pressable = false,
  onPress,
  ...props
}: CardProps) {
  const handlePress = (event: Parameters<NonNullable<TouchableOpacityProps['onPress']>>[0]) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.(event);
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    paddingStyles[padding],
    marginStyles[margin],
    style,
  ];

  if (pressable || onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={handlePress}
        activeOpacity={0.7}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Variants
  default: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  elevated: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
});
