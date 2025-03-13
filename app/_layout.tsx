// app/_layout.tsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { theme } from '../src/constants/theme';
import { useEffect } from 'react';

// This component handles the authentication flow and navigation stack
function RootLayoutNav() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inPostGroup = segments[0] === '(post)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inAuthGroup && !inPostGroup) {
      // Redirect to login if not authenticated and not in auth or post groups
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to tabs if authenticated and in auth group
      router.replace('/(tabs)');
    }
    // Allow navigation to (post)/[id] and (tabs) without redirection
  }, [user, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(post)/[id]" options={{ headerShown: false, title: 'Post' }} />
    </Stack>
  );
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