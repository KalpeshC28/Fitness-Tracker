import { MD3LightTheme, configureFonts } from 'react-native-paper';

const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#FF3B30',
  text: '#000000',
  onSurface: '#000000',
  disabled: '#C7C7CC',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.primary,
    onPrimaryContainer: '#FFFFFF',
    secondary: colors.secondary,
    onSecondary: '#FFFFFF',
    secondaryContainer: colors.secondary,
    onSecondaryContainer: '#FFFFFF',
    tertiary: colors.primary,
    onTertiary: '#FFFFFF',
    tertiaryContainer: colors.primary,
    onTertiaryContainer: '#FFFFFF',
    error: colors.error,
    onError: '#FFFFFF',
    errorContainer: colors.error,
    onErrorContainer: '#FFFFFF',
    background: colors.background,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.surface,
    onSurfaceVariant: colors.text,
    outline: '#E0E0E0',
    outlineVariant: '#CCCCCC',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#000000',
    inverseOnSurface: '#FFFFFF',
    inversePrimary: colors.primary,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#FFFFFF',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
  roundness: 4,
};

// Neomorphic shadow styles
export const neomorphShadow = {
  shadowColor: '#000',
  shadowOffset: {
    width: 4,
    height: 4,
  },
  shadowOpacity: 0.3,
  shadowRadius: 4.65,
  elevation: 8,
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderColor: '#E0E0E0',
  borderWidth: 1,
};

// Glassmorphism effect
export const glassMorphism = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderColor: '#E0E0E0',
  borderWidth: 1,
  elevation: 4,
};

// Glowing button effect
export const glowEffect = {
  shadowColor: '#007AFF',
  shadowOffset: {
    width: 0,
    height: 0,
  },
  shadowOpacity: 0.5,
  shadowRadius: 10,
  elevation: 6,
};

// Card style
export const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  borderColor: '#E0E0E0',
  borderWidth: 1,
  elevation: 4,
};

// Button style
export const buttonStyle = {
  borderRadius: 8,
  marginVertical: 8,
}; 