import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Button, Avatar, Card, IconButton, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Community } from '../../types/community';
import { Post } from '../../types/post';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { Video } from 'expo-av';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams();
  const { supabase, user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'admin' | null>(null);

  const fetchCommunity = async () => {
    try {
      // Fetch community with fresh member count
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select(`
          *,
          members:community_members(count)
        `)
        .eq('id', id)
        .single();

      if (communityError) throw communityError;

      // Fetch creator details
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', communityData.creator_id)
        .single();

      if (creatorError) throw creatorError;

      setCommunity({
        ...communityData,
        creator: creatorData
      });
      setMemberCount(communityData.member_count);

      // Check user membership and role
      const { data: memberData, error: memberError } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', id)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (!memberError) {
        setIsMember(true);
        setUserRole(memberData.role as 'member' | 'admin');
      } else {
        setIsMember(false);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching community:', error);
      alert('Failed to load community');
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('community_id', id)
        .eq('post_type', 'community')
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

  const handleJoin = async () => {
    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: id,
          user_id: user?.id,
          role: 'member',
          status: 'active',
        });

      if (error) throw error;
      
      // Fetch updated community data instead of manually updating state
      await fetchCommunity();
    } catch (error) {
      console.error('Error joining community:', error);
      alert('Failed to join community');
    }
  };

  const handleLeave = async () => {
    if (userRole === 'admin') {
      const isConfirmed = window.confirm(
        'As an admin, leaving the community will transfer ownership to another member if available, or delete the community if you are the last member. Are you sure?'
      );
      if (!isConfirmed) return;

      try {
        // First check if there are other members
        const { data: membersData, error: membersError } = await supabase
          .from('community_members')
          .select('user_id, role')
          .eq('community_id', id)
          .neq('user_id', user?.id)
          .eq('status', 'active');

        if (membersError) throw membersError;

        if (!membersData || membersData.length === 0) {
          // Delete the community if admin is the last member
          const { error: deleteError } = await supabase
            .from('communities')
            .delete()
            .eq('id', id)
            .eq('creator_id', user?.id);

          if (deleteError) throw deleteError;
          router.replace('/(tabs)');
          return;
        }

        // If there are other members, promote the first one to admin
        const newAdmin = membersData[0];
        const { error: promoteError } = await supabase
          .from('community_members')
          .update({ role: 'admin' })
          .eq('community_id', id)
          .eq('user_id', newAdmin.user_id);

        if (promoteError) throw promoteError;

        // Update community creator
        const { error: updateCreatorError } = await supabase
          .from('communities')
          .update({ creator_id: newAdmin.user_id })
          .eq('id', id);

        if (updateCreatorError) throw updateCreatorError;
      } catch (error) {
        console.error('Error handling admin leave:', error);
        alert('Failed to transfer ownership');
        return;
      }
    }

    try {
      // Leave the community
      const { error: leaveError } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', id)
        .eq('user_id', user?.id);

      if (leaveError) throw leaveError;

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error leaving community:', error);
      alert('Failed to leave community');
    }
  };

  const handleDeleteCommunity = async () => {
    if (userRole !== 'admin') {
      alert('Only admins can delete communities');
      return;
    }

    const isConfirmed = window.confirm(
      'Are you sure you want to delete this community? This action cannot be undone.'
    );
    if (!isConfirmed) return;

    try {
      // Delete the community directly
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', id)
        .eq('creator_id', user?.id);

      if (error) {
        console.error('Delete error:', error);
        if (error.code === 'PGRST204') {
          alert('You do not have permission to delete this community.');
        } else {
          alert('Failed to delete community. Please try again.');
        }
        return;
      }

      // Navigate back to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error deleting community:', error);
      alert('Failed to delete community. Please try again.');
    }
  };

  useEffect(() => {
    fetchCommunity();
    fetchPosts();

    // Subscribe to member count changes
    const channel = supabase
      .channel('community_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_members',
          filter: `community_id=eq.${id}`
        },
        () => {
          fetchCommunity(); // Refresh community data when members change
        }
      )
      .subscribe();

    // Subscribe to community deletion
    const deleteChannel = supabase
      .channel('community_deletion')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'communities',
          filter: `id=eq.${id}`
        },
        () => {
          router.replace('/(tabs)');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(deleteChannel);
    };
  }, [id]);

  const renderPost = (post: Post) => (
    <Card key={post.id} style={styles.post}>
      <Card.Title
        title={post.author?.full_name || post.author?.username}
        subtitle={new Date(post.created_at).toLocaleDateString()}
        left={props => (
          <Avatar.Image
            {...props}
            size={40}
            source={{ uri: post.author?.avatar_url || undefined }}
          />
        )}
      />
      <Card.Content>
        <Text variant="bodyLarge">{post.content}</Text>
      </Card.Content>
      {post.media_urls && post.media_urls.length > 0 && (
        <View style={styles.mediaContainer}>
          {post.media_type === 'video' ? (
            <Video
              source={{ uri: post.media_urls[0] }}
              style={styles.media}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          ) : (
            <Image
              source={{ uri: post.media_urls[0] }}
              style={styles.media}
              resizeMode="cover"
            />
          )}
        </View>
      )}
      <Card.Actions>
        <Button icon="heart-outline">{post.likes_count || 0}</Button>
        <Button icon="comment-outline">{post.comments_count || 0}</Button>
        <Button icon="share-outline">Share</Button>
      </Card.Actions>
    </Card>
  );

  if (!community) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => router.back()} />
        <Text variant="titleLarge" style={styles.title}>{community.name}</Text>
        <View style={styles.headerActions}>
          {userRole === 'admin' && (
            <IconButton
              icon="delete"
              onPress={handleDeleteCommunity}
              iconColor="#FF3B30"
            />
          )}
          {isMember ? (
            <Button mode="outlined" onPress={handleLeave}>
              {userRole === 'admin' ? 'Leave & Transfer' : 'Leave'}
            </Button>
          ) : (
            <Button mode="contained" onPress={handleJoin}>Join</Button>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPosts();
            }}
          />
        }
      >
        <View style={styles.communityInfo}>
          {community.cover_image && (
            <Card style={styles.coverImageCard}>
              <Card.Cover source={{ uri: community.cover_image }} />
            </Card>
          )}
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={styles.statNumber}>
                {memberCount}
              </Text>
              <Text variant="bodyMedium" style={styles.statLabel}>
                {memberCount === 1 ? 'Member' : 'Members'}
              </Text>
            </View>
          </View>

          <Text variant="bodyLarge" style={styles.description}>
            {community.description || 'No description'}
          </Text>

          <View style={styles.creatorInfo}>
            <Text variant="bodyMedium">
              Created by {community.creator?.full_name || community.creator?.username}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {isMember && (
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setCreatePostVisible(true)}
            style={styles.createPostButton}
          >
            Create Post
          </Button>
        )}

        {posts.map(renderPost)}
      </ScrollView>

      <CreatePostModal
        visible={createPostVisible}
        onDismiss={() => setCreatePostVisible(false)}
        onPost={fetchPosts}
        communityId={id}
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    flex: 1,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  communityInfo: {
    padding: 16,
  },
  coverImageCard: {
    marginBottom: 16,
  },
  description: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    color: '#666666',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  divider: {
    marginVertical: 16,
  },
  createPostButton: {
    margin: 16,
    marginTop: 0,
  },
  post: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    marginVertical: 8,
  },
  media: {
    width: '100%',
    height: '100%',
  },
  uploadProgress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 