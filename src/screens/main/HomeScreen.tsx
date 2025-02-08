import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated, TouchableWithoutFeedback } from 'react-native';
import { Text, Card, Avatar, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types/post';
import { CreatePostFAB } from '../../components/common/CreatePostFAB';
import { Sidebar } from '../../components/common/Sidebar';

const SIDEBAR_WIDTH = 300;

export default function HomeScreen() {
  const { supabase } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

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

  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton
        icon="menu"
        size={24}
        onPress={() => toggleDrawer(true)}
      />
      <Text variant="headlineMedium">Home</Text>
    </View>
  );

  const toggleDrawer = (open: boolean) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: open ? 0 : -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: open ? 0.5 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Only update isDrawerOpen after animation completes when closing
      if (!open) {
        setIsDrawerOpen(false);
      } else {
        setIsDrawerOpen(true);
      }
    });
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
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

      {/* Always render overlay and sidebar, but control visibility with opacity */}
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: overlayOpacity },
          !isDrawerOpen && styles.pointerEventsNone,
        ]}
      >
        <TouchableWithoutFeedback onPress={() => toggleDrawer(false)}>
          <View style={styles.overlayTouch} />
        </TouchableWithoutFeedback>
      </Animated.View>

      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Sidebar />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 1,
  },
  overlayTouch: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  pointerEventsNone: {
    pointerEvents: 'none',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'white',
    zIndex: 2,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 