import { Colors, ColorScheme } from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

export function useTheme() {
  const colorScheme = useColorScheme();

  return {
    colors: Colors[colorScheme],
    colorScheme,
    isDark: colorScheme === 'dark',
  };
}

export default useTheme;
