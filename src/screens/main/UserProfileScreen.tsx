import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, Card, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  interests: string | null;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { supabase } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
        alert('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading || !profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => router.back()} 
        />
        <Text variant="titleLarge">{profile.username}</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <Avatar.Image
            size={80}
            source={{ uri: profile.avatar_url || undefined }}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {profile.full_name}
          </Text>
          <Text variant="bodyLarge" style={styles.username}>
            @{profile.username}
          </Text>
        </View>

        {profile.bio && (
          <Card style={styles.section}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Bio</Text>
              <Text variant="bodyMedium">{profile.bio}</Text>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Details</Text>
            {profile.location && (
              <View style={styles.detail}>
                <Text variant="bodyMedium" style={styles.label}>Location</Text>
                <Text variant="bodyMedium">{profile.location}</Text>
              </View>
            )}
            {profile.interests && (
              <View style={styles.detail}>
                <Text variant="bodyMedium" style={styles.label}>Interests</Text>
                <Text variant="bodyMedium">{profile.interests}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  name: {
    marginTop: 12,
    fontWeight: 'bold',
  },
  username: {
    color: '#666',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  detail: {
    marginBottom: 8,
  },
  label: {
    color: '#666',
    marginBottom: 4,
  },
}); 