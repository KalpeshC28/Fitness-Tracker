// src/screens/main/SearchScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Text, Searchbar, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Community } from '../../types/community';

export default function SearchScreen() {
  const { supabase, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Compute numColumns based on screen width
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth < 400 ? 2 : 3; // 2 columns for small screens, 3 for larger screens

  const fetchCommunities = async (query: string = '') => {
    setLoading(true);
    setError(null);
    try {
      // Fetch public communities
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
        .ilike('name', `%${query}%`);

      if (communitiesError) {
        console.error('Communities fetch error:', communitiesError);
        throw new Error(`Failed to fetch communities: ${communitiesError.message}`);
      }

      if (!communitiesData || communitiesData.length === 0) {
        console.log('No public communities found');
        setCommunities([]);
        return;
      }

      // Fetch active members for these communities
      const { data: allMembers, error: membersError } = await supabase
        .from('community_members')
        .select('community_id')
        .in('community_id', communitiesData.map(c => c.id))
        .eq('status', 'active');

      if (membersError) {
        console.error('Members fetch error:', membersError);
        throw new Error(`Failed to fetch members: ${membersError.message}`);
      }

      // Count members for each community
      const memberCounts = communitiesData.reduce((acc, community) => {
        acc[community.id] = allMembers.filter(m => m.community_id === community.id).length;
        return acc;
      }, {} as Record<string, number>);

      // Fetch user's joined communities
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) {
        console.error('User membership fetch error:', memberError);
        throw new Error(`Failed to fetch user memberships: ${memberError.message}`);
      }

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
      setError(error.message || 'Failed to load communities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch communities when search query changes or on initial load
  useEffect(() => {
    if (user) {
      fetchCommunities(searchQuery);
    } else {
      setLoading(false);
      setError('Please log in to search for communities');
    }
  }, [searchQuery, user]);

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
          fetchCommunities(searchQuery); // Refresh when members change
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

  const navigateToCommunity = (communityId: string) => {
    router.push(`/community/${communityId}`);
  };

  const navigateToCreateCommunity = () => {
    router.push('/create-community'); // Navigate to the Create Community page
  };

  const renderCommunityCard = ({ item }: { item: Community }) => {
    const isJoined = joinedCommunities.has(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToCommunity(item.id)}
      >
        <View style={styles.coverImageContainer}>
          {item.cover_image ? (
            <Image
              source={{ uri: item.cover_image }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Text style={styles.coverImagePlaceholderText}>No Image</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.communityName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.communityDetails} numberOfLines={2} ellipsizeMode="tail">
            {item.description ? item.description : 'No description'}
          </Text>
          <Text style={styles.memberCount}>
            {item.member_count} {item.member_count === 1 ? 'Member' : 'Members'}
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              mode={isJoined ? 'outlined' : 'contained'}
              onPress={() => {
                if (!isJoined) {
                  handleJoin(item.id);
                } else {
                  navigateToCommunity(item.id);
                }
              }}
              style={isJoined ? styles.joinedButton : styles.joinButton}
              labelStyle={isJoined ? styles.joinedButtonLabel : styles.joinButtonLabel}
            >
              {isJoined ? 'Joined' : 'Join'}
            </Button>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search for communities to join"
          onChangeText={(query) => {
            setSearchQuery(query);
          }}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchBarInput}
          iconColor="#666666"
          right={() => (
            <IconButton
              icon="plus"
              size={24}
              onPress={navigateToCreateCommunity}
              iconColor="#007AFF"
              style={styles.plusButton}
            />
          )}
        />

        {error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={communities}
            renderItem={renderCommunityCard}
            keyExtractor={item => item.id}
            numColumns={numColumns} // Dynamic number of columns
            key={`flatlist-${numColumns}`} // Add key to force re-render when numColumns changes
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchCommunities(searchQuery);
                }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {loading ? 'Loading communities...' : 'Search for communities to join'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background for better contrast
  },
  content: {
    flex: 1,
    padding: 12,
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchBarInput: {
    fontSize: 16,
    color: '#333333',
  },
  plusButton: {
    marginRight: 8,
  },
  list: {
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background for cards
    borderRadius: 12,
    marginHorizontal: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    height: 200, // Reduced height for a more compact look
    overflow: 'hidden',
  },
  coverImageContainer: {
    width: '100%',
    height: 60, // Reduced height for the cover image
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8ECEF', // Softer gray for placeholder
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImagePlaceholderText: {
    color: '#A0A0A0', // Lighter text color for placeholder
    fontSize: 10,
    fontWeight: '500',
  },
  cardContent: {
    flex: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  communityName: {
    fontSize: 14, // Slightly smaller font
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  communityDetails: {
    fontSize: 12, // Smaller font for description
    color: '#666666',
    lineHeight: 16, // Better readability
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 10,
    color: '#888888',
    marginBottom: 6,
  },
  buttonContainer: {
    alignSelf: 'flex-start',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 8, // Reduced padding
    paddingVertical: 0,
  },
  joinButtonLabel: {
    color: '#FFFFFF',
    fontSize: 12, // Smaller font size
    fontWeight: '500',
  },
  joinedButton: {
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 25, // Reduced padding
    paddingVertical: 0,
  },
  joinedButtonLabel: {
    color: '#007AFF',
    fontSize: 12, // Smaller font size
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});