import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, Card, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { supabase } = useAuth();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) return;

    setLoading(true);
    try {
      // Search users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(5);

      // Search communities
      const { data: communities, error: communitiesError } = await supabase
        .from('communities')
        .select('id, name, description, cover_image')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (usersError) throw usersError;
      if (communitiesError) throw communitiesError;

      setResults([
        ...(users || []).map(user => ({ ...user, type: 'user' })),
        ...(communities || []).map(community => ({ ...community, type: 'community' }))
      ]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = ({ item }: any) => (
    <Card style={styles.resultCard}>
      <Card.Title
        title={item.type === 'user' ? (item.full_name || item.username) : item.name}
        subtitle={item.type === 'user' ? '@' + item.username : 'Community'}
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.avatar_url || item.cover_image }}
            size={40}
          />
        )}
      />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Searchbar
          placeholder="Search users and communities"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />

        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">
                {searchQuery.length > 0 
                  ? 'No results found'
                  : 'Start typing to search'}
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
    padding: 10,
  },
  searchBar: {
    marginBottom: 10,
  },
  resultCard: {
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 