import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Avatar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types/post';
import { CreatePostFAB } from '../../components/common/CreatePostFAB';

export default function HomeScreen() {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('extended_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Post type
      const transformedPosts = (data || []).map(post => ({
        ...post,
        author: {
          id: post.author_id,
          full_name: post.author_full_name,
          username: post.author_username,
          avatar_url: post.author_avatar_url
        },
        community: post.community_id ? {
          id: post.community_id,
          name: post.community_name
        } : undefined
      }));

      setPosts(transformedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.card}>
      <Card.Title
        title={item.author?.full_name || item.author?.username}
        subtitle={item.community?.name}
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.author?.avatar_url || undefined }}
          />
        )}
      />
      <Card.Content>
        <Text variant="bodyLarge">{item.content}</Text>
      </Card.Content>
      {item.media_urls && item.media_urls.length > 0 && (
        <Card.Cover source={{ uri: item.media_urls[0] }} />
      )}
      <Card.Actions>
        <Button icon="heart-outline">
          {item.likes_count || 0}
        </Button>
        <Button icon="comment-outline">
          {item.comments_count || 0}
        </Button>
        <Button icon="share-outline">Share</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPosts();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge">No posts yet</Text>
          </View>
        }
      />
      <CreatePostFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
}); 