import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface FABAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  mainIcon?: keyof typeof Ionicons.glyphMap;
  mainColor?: string;
  style?: ViewStyle;
  size?: number;
}

export default function FloatingActionButton({
  actions,
  mainIcon = 'add',
  mainColor = '#10b981',
  style,
  size = 56,
}: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    const toValue = isExpanded ? 0 : 1;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const mainButtonRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const actionButtonScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const actionButtonOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const handleActionPress = (action: FABAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
    toggleExpanded();
  };

  return (
    <View style={[styles.container, style]}>
      {/* Action Buttons */}
      {actions.map((action, index) => (
        <Animated.View
          key={action.label}
          style={[
            styles.actionContainer,
            {
              transform: [
                {
                  scale: actionButtonScale,
                },
                {
                  translateY: animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(size + 16) * (index + 1)],
                  }),
                },
              ],
              opacity: actionButtonOpacity,
            },
          ]}
        >
          <View style={styles.labelContainer}>
            <Text style={styles.label}>{action.label}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: (size * 0.8) / 2,
                backgroundColor: action.color || '#6b7280',
              },
            ]}
            onPress={() => handleActionPress(action)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={action.icon}
              size={size * 0.4}
              color="#ffffff"
            />
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Main Button */}
      <TouchableOpacity
        style={[
          styles.mainButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: mainColor,
          },
        ]}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Animated.View
          style={{
            transform: [{ rotate: mainButtonRotation }],
          }}
        >
          <Ionicons
            name={mainIcon}
            size={size * 0.5}
            color="#ffffff"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Backdrop */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={toggleExpanded}
          activeOpacity={1}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'center',
  },

  mainButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  actionContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    right: 0,
  },

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  labelContainer: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },

  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },

  backdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
  },
});
