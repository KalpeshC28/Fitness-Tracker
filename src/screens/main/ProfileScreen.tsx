// src/screens/main/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, Card, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ProfileCompletionModal } from '../../components/modals/ProfileCompletionModal';

interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  interests: string | null;
  is_profile_complete: boolean;
  aura_points: number; // Add aura_points to the Profile interface
}

interface CommunityRank {
  community_id: string;
  community_name: string;
  rank: string;
  position: number;
}

export default function ProfileScreen() {
  const { signOut, user, supabase } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communityRanks, setCommunityRanks] = useState<CommunityRank[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      // Fetch user profile including aura_points
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, location, interests, is_profile_complete, aura_points')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch communities the user is a member of
      const { data: userCommunities, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
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
          .eq('user_id', user?.id)
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={{ uri: profile?.avatar_url || undefined }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text variant="headlineMedium" style={styles.name}>
              {profile?.full_name || 'No Name'}
            </Text>
            <Text variant="bodyLarge" style={styles.username}>
              @{profile?.username || 'username'}
            </Text>
          </View>
          <IconButton
            icon="pencil"
            size={24}
            onPress={() => setShowEditModal(true)}
            style={styles.editButton}
          />
        </View>

        {/* Leaderboard Stats Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Leaderboard Stats</Text>
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Aura Points</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {profile?.aura_points || 0} Aura
              </Text>
            </View>
            {communityRanks.length > 0 ? (
              communityRanks.map((rank, index) => (
                <View key={rank.community_id}>
                  <Divider style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={styles.detailLabel}>
                      {rank.community_name}
                    </Text>
                    <View style={styles.rankInfo}>
                      <Text variant="bodyMedium" style={styles.detailValue}>
                        Rank: {rank.rank}
                      </Text>
                      <Text variant="bodyMedium" style={styles.detailValue}>
                        Position: #{rank.position}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodyMedium" style={styles.noRanksText}>
                  Join a community to see your ranks!
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Bio Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Bio</Text>
            <Text variant="bodyMedium" style={styles.bio}>
              {profile?.bio || 'No bio added yet'}
            </Text>
          </Card.Content>
        </Card>

        {/* Details Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Location</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {profile?.location || 'Not specified'}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Interests</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {profile?.interests || 'Not specified'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={signOut}
            style={styles.signOutButton}
            buttonColor="#FF3B30"
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>

      <ProfileCompletionModal
        visible={showEditModal}
        onComplete={() => {
          setShowEditModal(false);
          fetchProfile();
        }}
        onClose={() => setShowEditModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  avatar: {
    backgroundColor: '#e1e1e1',
  },
  name: {
    fontWeight: 'bold',
  },
  username: {
    color: '#666',
  },
  editButton: {
    marginLeft: 'auto',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  bio: {
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#666',
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  rankInfo: {
    flex: 2,
    alignItems: 'flex-end',
  },
  divider: {
    marginVertical: 8,
  },
  noRanksText: {
    color: '#666',
    textAlign: 'center',
  },
  actions: {
    padding: 16,
  },
  signOutButton: {
    marginTop: 8,
  },
});