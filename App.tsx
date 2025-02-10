import { PaperProvider } from 'react-native-paper';
import { theme } from './src/constants/theme';
import { AuthProvider } from './src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot } from 'expo-router';

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 