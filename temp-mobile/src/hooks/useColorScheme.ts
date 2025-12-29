import { useColorScheme as useRNColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export function useColorScheme(): ColorScheme {
  const colorScheme = useRNColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}

export default useColorScheme;
