// src/screens/main/UserProfileScreen.tsx
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
  aura_points: number; // Add aura_points to the UserProfile interface
}

interface CommunityRank {
  community_id: string;
  community_name: string;
  rank: string;
  position: number;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const { supabase } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [communityRanks, setCommunityRanks] = useState<CommunityRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch user profile including aura_points
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, bio, location, interests, aura_points')
          .eq('id', id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch communities the user is a member of
        const { data: userCommunities, error: membershipError } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', id)
          .eq('status', 'active');

        if (membershipError) throw membershipError;

        const communityIds = userCommunities.map(uc => uc.community_id);

        // Fetch community names and user ranks
        if (communityIds.length > 0) {
          const { data: communitiesData, error: communitiesError } = await supabase
            .from('communities')
            .select('id, name')
            .in('id', communityIds);

          if (communitiesError) throw communitiesError;

          const { data: ranksData, error: ranksError } = await supabase
            .from('user_points')
            .select('community_id, rank, position')
            .eq('user_id', id)
            .in('community_id', communityIds);

          if (ranksError) throw ranksError;

          // Combine community names with ranks
          const ranksWithCommunity = ranksData.map(rank => {
            const community = communitiesData.find(c => c.id === rank.community_id);
            return {
              community_id: rank.community_id,
              community_name: community?.name || 'Unknown Community',
              rank: rank.rank,
              position: rank.position,
            };
          });

          setCommunityRanks(ranksWithCommunity);
        }
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

        {/* Leaderboard Stats Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Leaderboard Stats</Text>
            <View style={styles.detail}>
              <Text variant="bodyMedium" style={styles.label}>Aura Points</Text>
              <Text variant="bodyMedium">{profile.aura_points || 0} Aura</Text>
            </View>
            {communityRanks.length > 0 ? (
              communityRanks.map((rank, index) => (
                <View key={rank.community_id}>
                  <View style={styles.detail}>
                    <Text variant="bodyMedium" style={styles.label}>
                      {rank.community_name}
                    </Text>
                    <Text variant="bodyMedium">Rank: {rank.rank}</Text>
                    <Text variant="bodyMedium">Position: #{rank.position}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.detail}>
                <Text variant="bodyMedium" style={styles.noRanksText}>
                  This user hasn’t joined any communities yet.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

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
  noRanksText: {
    color: '#666',
  },
});