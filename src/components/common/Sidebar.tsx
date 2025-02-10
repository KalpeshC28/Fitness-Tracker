import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Searchbar, Button, List, Avatar, Divider, useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { Community } from '../../types/community';

export function Sidebar() {
  const { supabase, user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const fetchJoinedCommunities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          community:communities(
            id,
            name,
            cover_image,
            description
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      setCommunities(data?.map(item => item.community) || []);
    } catch (error) {
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJoinedCommunities();
  }, [user]);

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Communities</Text>
      </View>
      <Divider />
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search communities"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor={theme.colors.primary}
        />

        <Button
          mode="contained"
          icon="plus"
          onPress={() => router.push('/create-community')}
          style={styles.createButton}
        >
          Create New
        </Button>
      </View>

      <ScrollView style={styles.communitiesList}>
        {filteredCommunities.map((community) => (
          <List.Item
            key={community.id}
            title={community.name}
            description={community.description}
            left={(props) => (
              <Avatar.Image
                {...props}
                size={40}
                source={{ uri: community.cover_image || undefined }}
              />
            )}
            onPress={() => router.push(`/community/${community.id}`)}
            style={styles.communityItem}
            titleStyle={styles.communityTitle}
            descriptionStyle={styles.communityDescription}
            rippleColor={theme.colors.primary}
          />
        ))}
        
        {!loading && filteredCommunities.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No communities found' : 'No communities joined yet'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    paddingTop: 20,
    marginTop: 50,
  },
  title: {
    fontWeight: 'bold',
  },

  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchBar: {
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  createButton: {
    borderRadius: 8,
  },
  communitiesList: {
    flex: 1,
  },
  communityItem: {
    paddingHorizontal: 16,
  },
  communityTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  communityDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666666',
  },
}); 