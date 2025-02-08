import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { theme } from '../src/constants/theme';
import { useEffect } from 'react';

// This component handles the authentication flow
function RootLayoutNav() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to the sign-in page if not signed in
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to the home page if signed in
      router.replace('/(tabs)');
    }
  }, [user, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

// Root layout with providers
export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <RootLayoutNav />
      </PaperProvider>
    </AuthProvider>
  );
} 