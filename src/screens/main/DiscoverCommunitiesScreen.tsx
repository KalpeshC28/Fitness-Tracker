// src/screens/main/DiscoverCommunities.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Community } from '../../types/community';

export default function DiscoverCommunitiesScreen() {
  const { supabase, user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());

  const fetchCommunities = async () => {
    try {
      // Fetch all public communities
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select(`
          id,
          name,
          description,
          cover_image,
          is_private,
          creator_id,
          created_at,
          creator:profiles (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('is_private', false)
        .ilike('name', `%${searchQuery}%`);

      if (communitiesError) throw communitiesError;

      // Get all active members for these communities
      const { data: allMembers, error: membersError } = await supabase
        .from('community_members')
        .select('community_id')
        .in('community_id', communitiesData.map(c => c.id))
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Count members for each community
      const memberCounts = communitiesData.reduce((acc, community) => {
        acc[community.id] = allMembers.filter(m => m.community_id === community.id).length;
        return acc;
      }, {} as Record<string, number>);

      // Get user's joined communities
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Create a Set of joined community IDs
      const joinedIds = new Set(memberData?.map(m => m.community_id) || []);
      setJoinedCommunities(joinedIds);

      // Combine all data
      const communitiesWithCounts = communitiesData.map(community => ({
        ...community,
        member_count: memberCounts[community.id] || 0,
      }));

      setCommunities(communitiesWithCounts);
    } catch (error) {
      console.error('Error fetching communities:', error);
      alert('Failed to load communities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, [searchQuery]);

  // Listen for member count changes
  useEffect(() => {
    const channel = supabase
      .channel('member_count_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_members',
        },
        () => {
          fetchCommunities(); // Refresh when members change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleJoin = async (communityId: string) => {
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user?.id,
          role: 'member',
          status: 'active',
        });

      if (error) throw error;

      // Update local state
      setJoinedCommunities(prev => new Set([...prev, communityId]));

      // Update member count in the communities list
      setCommunities(prev =>
        prev.map(c =>
          c.id === communityId
            ? { ...c, member_count: c.member_count + 1 }
            : c
        )
      );
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Failed to join community');
    }
  };

  const renderCommunityCard = ({ item }: { item: Community }) => {
    const isJoined = joinedCommunities.has(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/community/${item.id}`)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.communityName}>{item.name}</Text>
          <Text style={styles.communityDetails}>
            {item.description ? item.description.slice(0, 50) + '...' : '-details'}
          </Text>
          <Button
            mode={isJoined ? 'outlined' : 'contained'}
            onPress={() => {
              if (!isJoined) {
                handleJoin(item.id);
              } else {
                router.push(`/community/${item.id}`);
              }
            }}
            style={isJoined ? styles.joinedButton : styles.joinButton}
            labelStyle={isJoined ? styles.joinedButtonLabel : styles.joinButtonLabel}
          >
            {isJoined ? 'Joined' : 'Join'}
          </Button>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={() => router.back()}
          iconColor="#333333"
        />
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Discover Communities
        </Text>
      </View>

      <Searchbar
        placeholder="Search Community here..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchBarInput}
        iconColor="#666666"
      />

      <FlatList
        data={communities}
        renderItem={renderCommunityCard}
        keyExtractor={item => item.id}
        numColumns={2} // Display 2 columns
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCommunities();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              {loading ? 'Loading communities...' : 'No communities found'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#333333',
    fontWeight: '600',
  },
  searchBar: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBarInput: {
    fontSize: 16,
    color: '#333333',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  communityDetails: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  joinButtonLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  joinedButton: {
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  joinedButtonLabel: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666666',
  },
});