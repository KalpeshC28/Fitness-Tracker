import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { ActiveCommunityProvider } from '../../src/context/ActiveCommunityContext';

export default function TabLayout() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <ActiveCommunityProvider>
      <Tabs 
        screenOptions={{ 
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E0E0E0',
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="communities"
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-group" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="magnify" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bell" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account" size={28} color={color} />
            ),
          }}
        />
      </Tabs>
    </ActiveCommunityProvider>
  );
} 