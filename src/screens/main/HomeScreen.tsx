import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated, TouchableWithoutFeedback } from 'react-native';
import { Text, Card, Avatar, Button, IconButton, TextInput, Divider, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types/post';
import { Sidebar } from '../../components/common/Sidebar';

const SIDEBAR_WIDTH = 300;

export default function HomeScreen() {
  const { supabase, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postType, setPostType] = useState('general');
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

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

  const handlePost = async () => {
    if (!postContent.trim()) return;

    setIsPosting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          content: postContent.trim(),
          author_id: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          media_urls: [], // Add empty array for media
          likes_count: 0,
          comments_count: 0,
          community_id: null // Add null for community_id if not specified
        });

      if (error) throw error;

      setPostContent('');
      setPostType('general');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Card style={styles.card}>
      <Card.Title
        title={item.author?.full_name || item.author?.username}
        subtitle={
          <View style={styles.subtitleContainer}>
            <Text style={styles.postType}>{item.post_type || 'General'}</Text>
            {item.community?.name && (
              <Text style={styles.community}> • {item.community.name}</Text>
            )}
          </View>
        }
        left={(props) => (
          <Avatar.Image
            {...props}
            source={{ uri: item.author?.avatar_url || undefined }}
          />
        )}
        right={(props) => (
          <Menu
            visible={selectedPost === item.id}
            onDismiss={() => setSelectedPost(null)}
            anchor={
              <IconButton
                {...props}
                icon="dots-vertical"
                onPress={() => setSelectedPost(item.id)}
              />
            }
          >
            {item.author_id === user?.id ? (
              <Menu.Item 
                onPress={() => {
                  handleDeletePost(item.id);
                  setSelectedPost(null);
                }} 
                title="Delete" 
                leadingIcon="delete"
              />
            ) : (
              <Menu.Item 
                onPress={() => setSelectedPost(null)} 
                title="Report" 
                leadingIcon="flag"
              />
            )}
          </Menu>
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
        size={26}
        onPress={() => toggleDrawer(true)}
      />
      <Text variant="headlineSmall">TribeX</Text>
    </View>
  );

  const renderPostInput = () => (
    <View style={styles.postInputContainer}>
      <View style={styles.postInputHeader}>
        <Menu
          visible={postMenuVisible}
          onDismiss={() => setPostMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPostMenuVisible(true)}
              style={styles.typeButton}
            >
              {postType.charAt(0).toUpperCase() + postType.slice(1)}
            </Button>
          }
        >
          <Menu.Item onPress={() => {
            setPostType('general');
            setPostMenuVisible(false);
          }} title="General" />
          <Menu.Item onPress={() => {
            setPostType('question');
            setPostMenuVisible(false);
          }} title="Question" />
          <Menu.Item onPress={() => {
            setPostType('discussion');
            setPostMenuVisible(false);
          }} title="Discussion" />
        </Menu>
        <IconButton
          icon="image"
          size={24}
          onPress={() => {/* Handle attachment */}}
          style={styles.attachButton}
        />
      </View>
      <TextInput
        mode="flat"
        multiline
        placeholder="What's on your mind?"
        value={postContent}
        onChangeText={setPostContent}
        style={styles.postInput}
        underlineColor="transparent"
        placeholderTextColor="#666"
      />
      <Divider style={styles.divider} />
      <Button
        mode="contained"
        onPress={handlePost}
        loading={isPosting}
        disabled={!postContent.trim() || isPosting}
        style={styles.postButton}
        contentStyle={styles.postButtonContent}
      >
        Post
      </Button>
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
        {renderPostInput()}
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
    padding: 10,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    padding: 10,
    marginTop: 18,
  },
  card: {
    marginBottom: 10,
    zIndex: 0,
    marginTop:35,
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
  postInputContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 10,
    marginHorizontal: 13,
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1,
  },
  postInputHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  postInput: {
    flex: 1,
    backgroundColor: '#fff',
    minHeight: 60,
    fontSize: 16,
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  attachButton: {
    margin: 0,
    marginTop: -4,
  },
  typeButton: {
    borderRadius: 15,
    marginVertical: 4,
  },
  postButton: {
    borderRadius: 20,
    marginTop: 4,
  },
  postButtonContent: {
    height: 40,
    width: '100%',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postType: {
    color: '#666',
    fontSize: 12,
  },
  community: {
    color: '#666',
    fontSize: 12,
  },
}); 