// src/components/habits/LeaderboardContent.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar, Menu, Provider } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useActiveCommunity } from '../../context/ActiveCommunityContext';
import { router } from 'expo-router';

// Define the interface for leaderboard members
interface LeaderboardMember {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  joined_at: string;
  aura_points: number;
  rank: string;
  position?: number;
}

// Define a minimal type for the community dropdown
interface CommunityDropdownItem {
  id: string;
  name: string;
}

const LeaderboardContent: React.FC = () => {
  const { supabase, user } = useAuth();
  const { activeCommunityId, setActiveCommunityId } = useActiveCommunity();
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<CommunityDropdownItem[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch joined communities
  const fetchJoinedCommunities = async () => {
    if (!user) return;

    try {
      // Get communities where user is a member
      const { data: userCommunities, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      const communityIds = userCommunities.map(uc => uc.community_id);

      // Get community details
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('id, name')
        .in('id', communityIds);

      if (communitiesError) throw communitiesError;

      setCommunities(communitiesData);

      // Set first community as active by default if none selected
      if (!activeCommunityId && communitiesData.length > 0) {
        setActiveCommunityId(communitiesData[0].id);
      }
    } catch (error) {
      console.error('Error fetching communities:', error);
      setError('Failed to load communities');
    }
  };

  useEffect(() => {
    fetchJoinedCommunities();
  }, [user]);

  const fetchLeaderboard = async () => {
    if (!activeCommunityId) {
      setError('Please select a community');
      return;
    }

    try {
      // Verify that the community exists
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('id')
        .eq('id', activeCommunityId)
        .single();

      if (communityError || !communityData) {
        setError('Community not found');
        return;
      }

      // Fetch active members
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', activeCommunityId)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];
      if (memberIds.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Fetch profiles with aura_points
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, aura_points')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData.find(p => p.id === member.user_id);
        return {
          ...member,
          full_name: profile?.full_name || profile?.username || 'Unknown',
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
          aura_points: profile?.aura_points || 0,
        };
      });

      // Fetch position and rank for all members in this community
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, rank, position')
        .eq('community_id', activeCommunityId)
        .in('user_id', memberIds);

      if (pointsError) throw pointsError;

      const leaderboardData: LeaderboardMember[] = membersWithProfiles.map(member => {
        const pointsEntry = pointsData?.find(p => p.user_id === member.user_id);
        const rank = getRankLabel(member.aura_points);

        return {
          ...member,
          rank,
        };
      });

      // Sort by aura_points in descending order
      leaderboardData.sort((a, b) => b.aura_points - a.aura_points);

      // Update the position for each user and save to the database
      leaderboardData.forEach((member, index) => {
        const position = index + 1;
        updateUserRank(member.user_id, activeCommunityId, member.rank, position);
        member.position = position;
      });

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message);
      setError('Failed to load leaderboard');
    }
  };

  useEffect(() => {
    if (activeCommunityId) {
      fetchLeaderboard();
    }
  }, [activeCommunityId]);

  const getRankLabel = (auraPoints: number) => {
    if (auraPoints >= 8001) return 'Legendary';
    if (auraPoints >= 6001) return 'Grand Master';
    if (auraPoints >= 4501) return 'Master';
    if (auraPoints >= 3001) return 'Pro';
    if (auraPoints >= 2001) return 'Elite';
    if (auraPoints >= 1001) return 'Veteran';
    if (auraPoints >= 1) return 'Rookie';
    return 'Rookie';
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Rookie':
        return '#9E9E9E';
      case 'Veteran':
        return '#4CAF50';
      case 'Elite':
        return '#2196F3';
      case 'Pro':
        return '#FF9800';
      case 'Master':
        return '#F44336';
      case 'Grand Master':
        return '#9C27B0';
      case 'Legendary':
        return '#FFD700';
      default:
        return '#757575';
    }
  };

  const getPositionBackground = (index: number) => {
    switch (index) {
      case 0:
        return '#FFD700'; // Gold for 1st
      case 1:
        return '#C0C0C0'; // Silver for 2nd
      case 2:
        return '#CD7F32'; // Bronze for 3rd
      default:
        return 'transparent';
    }
  };

  const updateUserRank = async (
    userId: string,
    communityId: string,
    rank: string,
    position: number
  ) => {
    try {
      if (!communityId) {
        console.error('Error: communityId is missing or null for user', userId);
        return;
      }

      const { data: existing, error: fetchError } = await supabase
        .from('user_points')
        .select('user_id')
        .eq('user_id', userId)
        .eq('community_id', communityId);

      if (fetchError) {
        console.error('Error checking user_points:', fetchError.message);
        return;
      }

      if (existing.length === 0) {
        const { error: insertError } = await supabase
          .from('user_points')
          .insert({
            user_id: userId,
            community_id: communityId,
            rank,
            position,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error inserting user rank:', insertError.message);
          console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        } else {
          console.log(`Successfully inserted data for user ${userId} in community ${communityId}: Position ${position}, Rank ${rank}`);
        }
      } else {
        const { error: updateError } = await supabase
          .from('user_points')
          .update({
            rank,
            position,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('community_id', communityId);

        if (updateError) {
          console.error('Error updating user rank:', updateError.message);
          console.error('Update error details:', JSON.stringify(updateError, null, 2));
        } else {
          console.log(`Successfully updated data for user ${userId} in community ${communityId}: Position ${position}, Rank ${rank}`);
        }
      }
    } catch (error) {
      console.error('Unexpected error updating user rank:', error.message);
    }
  };

  const formatName = (fullName: string) => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
    }
    return fullName;
  };

  const renderItem = ({ item, index }: { item: LeaderboardMember; index: number }) => (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9F9F9' },
      ]}
      onPress={() => router.push(`/profile/${item.user_id}`)}
    >
      <View style={[styles.positionContainer, { backgroundColor: getPositionBackground(index) }]}>
        <Text style={styles.position}>#{item.position}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Avatar.Image
          size={36}
          source={{ uri: item.avatar_url || undefined }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{formatName(item.full_name)}</Text>
      </View>
      <Text style={styles.aura}>{item.aura_points} Aura</Text>
      <Text style={[styles.rank, { color: getRankColor(item.rank) }]}>{item.rank}</Text>
    </TouchableOpacity>
  );

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const selectedCommunity = communities.find(community => community.id === activeCommunityId);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <Provider>
      <View style={styles.container}>
        {/* Leaderboard Title and Dropdown */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Leaderboard</Text>
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <TouchableOpacity onPress={openMenu} style={styles.dropdownButton}>
                <Text style={styles.dropdownText}>
                  {selectedCommunity?.name || 'Select Community'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            }
          >
            {communities.map(community => (
              <Menu.Item
                key={community.id}
                onPress={() => {
                  setActiveCommunityId(community.id);
                  closeMenu();
                }}
                title={community.name}
              />
            ))}
          </Menu>
        </View>

        {/* Column Headers */}
        <View style={styles.headerRow}>
          <Text style={styles.headerPosition}>Rank</Text>
          <Text style={styles.headerUsername}>Username</Text>
          <Text style={styles.headerAura}>Aura Level</Text>
          <Text style={styles.headerRank}>Aura Rank</Text>
        </View>

        {/* Leaderboard List */}
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.user_id}
          ListEmptyComponent={<Text style={styles.emptyText}>No members yet</Text>}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    color: '#333333',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333333',
  },
  dropdownArrow: {
    fontSize: 12,
    marginLeft: 5,
    color: '#333333',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginBottom: 8,
  },
  headerPosition: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    width: 40,
    textAlign: 'center',
  },
  headerUsername: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
    marginLeft: 46,
    textAlign: 'left',
  },
  headerAura: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    width: 100,
    textAlign: 'center',
  },
  headerRank: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    width: 80,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  positionContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  position: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  aura: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00C4B4',
    width: 100,
    textAlign: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default LeaderboardContent;