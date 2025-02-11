import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, Card, Button, Avatar, IconButton, Chip } from 'react-native-paper';
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
      // First fetch all public communities
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select(`
          *,
          creator:profiles (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('is_private', false)
        .ilike('name', `%${searchQuery}%`)
        .order('member_count', { ascending: false });

      if (communitiesError) throw communitiesError;

      // Fetch user's joined communities
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Create a Set of joined community IDs
      const joinedIds = new Set(memberData?.map(m => m.community_id) || []);
      setJoinedCommunities(joinedIds);
      setCommunities(communitiesData || []);
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
      <Card style={styles.card}>
        {item.cover_image && (
          <Card.Cover source={{ uri: item.cover_image }} style={styles.coverImage} />
        )}
        <Card.Title
          title={item.name}
          subtitle={`${item.member_count} members`}
          left={props => (
            item.cover_image ? (
              <Avatar.Image
                {...props}
                size={40}
                source={{ uri: item.cover_image }}
              />
            ) : (
              <Avatar.Icon
                {...props}
                size={40}
                icon="account-group"
                color="#FFFFFF"
                style={{ backgroundColor: '#007AFF' }}
              />
            )
          )}
        />
        <Card.Content>
          <Text variant="bodyMedium" style={styles.description}>
            {item.description || 'No description'}
          </Text>
          <View style={styles.creatorInfo}>
            <Text variant="bodySmall">
              Created by {item.creator?.full_name || item.creator?.username}
            </Text>
          </View>
        </Card.Content>
        <Card.Actions>
          {isJoined ? (
            <Button
              mode="outlined"
              onPress={() => router.push(`/community/${item.id}`)}
            >
              View Community
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={() => handleJoin(item.id)}
            >
              Join Community
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => router.back()} 
        />
        <Text variant="headlineSmall">Discover Communities</Text>
      </View>

      <Searchbar
        placeholder="Search communities"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={communities}
        renderItem={renderCommunityCard}
        keyExtractor={item => item.id}
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
            <Text variant="bodyLarge">
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    margin: 16,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  coverImage: {
    height: 120,
  },
  description: {
    marginVertical: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 