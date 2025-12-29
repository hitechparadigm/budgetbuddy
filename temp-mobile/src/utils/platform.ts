import { Platform } from 'react-native';

export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';
export const isMobile = isIOS || isAndroid;

export const platformSelect = <T>(options: {
  ios?: T;
  android?: T;
  web?: T;
  default?: T;
}): T | undefined => {
  if (isIOS && options.ios !== undefined) return options.ios;
  if (isAndroid && options.android !== undefined) return options.android;
  if (isWeb && options.web !== undefined) return options.web;
  return options.default;
};

export const getStatusBarHeight = (): number => {
  return platformSelect({
    ios: 44,
    android: 24,
    default: 0,
  }) || 0;
};

export const getTabBarHeight = (): number => {
  return platformSelect({
    ios: 83,
    android: 56,
    default: 60,
  }) || 60;
};
