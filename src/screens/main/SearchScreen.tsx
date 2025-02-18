import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, Card, Avatar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Community } from '../../types/community';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const { supabase, user } = useAuth();

  const fetchCommunities = async (query: string = '') => {
    setLoading(true);
    try {
      // Get all public communities matching search
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

      if (communitiesError) throw communitiesError;

      // Get member counts
      const { data: allMembers, error: membersError } = await supabase
        .from('community_members')
        .select('community_id')
        .in('community_id', communitiesData.map(c => c.id))
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Get user's joined communities
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Calculate member counts and set joined communities
      const memberCounts = communitiesData.reduce((acc, community) => {
        acc[community.id] = allMembers?.filter(m => m.community_id === community.id).length || 0;
        return acc;
      }, {} as Record<string, number>);

      const communitiesWithCounts = communitiesData.map(community => ({
        ...community,
        member_count: memberCounts[community.id] || 0
      }));

      setCommunities(communitiesWithCounts);
      setJoinedCommunities(new Set(memberData?.map(m => m.community_id) || []));
    } catch (error) {
      console.error('Error fetching communities:', error);
      alert('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

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

      setJoinedCommunities(prev => new Set([...prev, communityId]));
      fetchCommunities(searchQuery);
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Failed to join community');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search communities"
          onChangeText={(query) => {
            setSearchQuery(query);
            fetchCommunities(query);
          }}
          value={searchQuery}
          style={styles.searchBar}
        />

        <FlatList
          data={communities}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Title
                title={item.name}
                subtitle={`${item.member_count} members`}
                left={props => (
                  item.cover_image ? (
                    <Avatar.Image {...props} size={40} source={{ uri: item.cover_image }} />
                  ) : (
                    <Avatar.Icon {...props} size={40} icon="account-group" />
                  )
                )}
              />
              <Card.Content>
                <Text variant="bodyMedium">{item.description || 'No description'}</Text>
              </Card.Content>
              <Card.Actions>
                {joinedCommunities.has(item.id) ? (
                  <Button mode="outlined">Already Joined</Button>
                ) : (
                  <Button mode="contained" onPress={() => handleJoin(item.id)}>
                    Join Community
                  </Button>
                )}
              </Card.Actions>
            </Card>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">
                {searchQuery ? 'No communities found' : 'Search for communities to join'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 16,
  },
  list: {
    gap: 16,
  },
  card: {
    elevation: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 