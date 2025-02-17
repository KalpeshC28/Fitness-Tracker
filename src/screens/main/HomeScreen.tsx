import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, Button, IconButton, TextInput, Divider, Menu, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types/post';
import { Sidebar } from '../../components/common/Sidebar';
import { useRouter } from 'expo-router';
import { neomorphShadow, glassMorphism, glowEffect } from '../../constants/theme';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { ProfileCompletionModal } from '../../components/modals/ProfileCompletionModal';

const SIDEBAR_WIDTH = 300;

// Add these color constants at the top of the file
const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  primary: '#007AFF',
  border: '#E0E0E0',
  text: '#666666',
};

export default function HomeScreen() {
  const { supabase, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [selectedPost, setSelectedPost] = useState(null);
  const router = useRouter();
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);

  const fetchPosts = async () => {
    try {
      // First get the communities the user is a member of
      const { data: memberOf, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Get the community IDs the user is a member of
      const communityIds = memberOf?.map(m => m.community_id) || [];

      // Fetch posts from those communities
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(
            id,
            full_name,
            username,
            avatar_url
          ),
          community:communities(
            id,
            name
          )
        `)
        .in('community_id', communityIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      alert('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to post changes in joined communities
    const channel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts(); // Refresh posts when there are changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_profile_complete')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking profile completion:', error);
        return;
      }

      if (!data?.is_profile_complete) {
        setShowProfileCompletion(true);
      }
    };

    checkProfileCompletion();
  }, [user]);

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
        title={
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${item.author_id}`)}
          >
            <Text style={styles.authorName}>
              {item.author?.full_name || item.author?.username}
            </Text>
          </TouchableOpacity>
        }
        subtitle={
          <TouchableOpacity 
            onPress={() => item.community_id && router.push(`/community/${item.community_id}`)}
          >
            <Text style={styles.communityName}>
              {item.community?.name ? `Posted in ${item.community.name}` : 'General'}
            </Text>
          </TouchableOpacity>
        }
        left={(props) => (
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${item.author_id}`)}
          >
            <Avatar.Image
              {...props}
              size={40}
              source={{ uri: item.author?.avatar_url || undefined }}
            />
          </TouchableOpacity>
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
        <Card.Cover 
          source={{ uri: item.media_urls[0] }} 
          style={styles.cardMedia}
        />
      )}
      <Card.Actions>
        <Button icon="heart-outline">{item.likes_count || 0}</Button>
        <Button icon="comment-outline">{item.comments_count || 0}</Button>
        <Button icon="share-outline">Share</Button>
      </Card.Actions>
    </Card>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <IconButton
          icon="menu"
          size={26}
          onPress={() => toggleDrawer(true)}
        />
        <Text variant="headlineSmall">TribeX</Text>
      </View>
      <Divider style={styles.divider} />
    </>
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF', // White for header area
    },
    contentContainer: {
      flex: 1,
      backgroundColor: '#fff', // Light gray for all content below header
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      backgroundColor: '#FFFFFF',
    },
    divider: {
      height: 1,
      backgroundColor: '#E0E0E0',
    },
    content: {
      padding: 5,
      
    },
    card: {
      marginBottom: 10,
      marginHorizontal: 8,
      backgroundColor: colors.surface,
      ...glassMorphism,
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
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
      backgroundColor: '#FFFFFF',
      zIndex: 2,
      ...neomorphShadow,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    postType: {
      color: colors.text,
      fontSize: 12,
    },
    community: {
      color: colors.text,
      fontSize: 12,
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: '#FFFFFF',
      borderRadius: 100,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    discoverButton: {
      margin: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      ...neomorphShadow,
    },
    discoverButtonLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.primary,
    },
    cardMedia: {
      marginTop: 10,
      marginHorizontal: 10,
      borderRadius: 8,
      height: 200,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000',
    },
    communityName: {
      fontSize: 14,
      color: '#007AFF',
    },
  });

  return (
    <>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.contentContainer}>
          <Button
            mode="outlined"
            icon="account-group"
            onPress={() => router.push('/discover-communities')}
            style={styles.discoverButton}
            labelStyle={styles.discoverButtonLabel}
          >
            Discover Communities
          </Button>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            style={{ backgroundColor: '#f1f5f9' }}
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
        </View>
      </SafeAreaView>

      {isDrawerOpen && (
        <Animated.View 
          style={[
            styles.overlay,
            { opacity: overlayOpacity }
          ]}
        >
          <TouchableWithoutFeedback onPress={() => toggleDrawer(false)}>
            <View style={styles.overlayTouch} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

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

      <ProfileCompletionModal
        visible={showProfileCompletion}
        onComplete={() => setShowProfileCompletion(false)}
        onClose={() => setShowProfileCompletion(false)}
      />
    </>
  );
} 