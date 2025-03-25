// src/screens/main/CommunityScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Avatar, Card, IconButton, Divider, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Community } from '../../types/community';
import { Post } from '../../types/post';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { Video, ResizeMode } from 'expo-av';
import { EditCommunityModal } from '../../components/modals/EditCommunityModal';

interface CommunityMember {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { supabase, user } = useAuth();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [userRole, setUserRole] = useState<'member' | 'admin' | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchCommunity = async () => {
    try {
      // Fetch community details
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select(`
          *,
          creator:profiles(
            id, full_name, username, avatar_url
          )
        `)
        .eq('id', id)
        .single();

      if (communityError) throw communityError;

      // Update the members fetch query in fetchCommunity function
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', id)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Fetch profiles for members in a separate query
      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const transformedMembers = (membersData || []).map(member => {
        const profile = profilesData?.find(p => p.id === member.user_id);
        return {
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          user: {
            full_name: profile?.full_name,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
          },
        };
      });

      setCommunity(communityData);
      setMembers(transformedMembers);
      setMemberCount(transformedMembers.length);

      // Check user membership and role
      const userMember = transformedMembers.find(m => m.user_id === user?.id);
      if (userMember) {
        setIsMember(true);
        setUserRole(userMember.role as 'member' | 'admin');
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
          ),
          community:communities(
            id,
            name
          )
        `)
        .eq('community_id', id)
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
          filter: `community_id=eq.${id}`,
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
          filter: `id=eq.${id}`,
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
              resizeMode={ResizeMode.CONTAIN}
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
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => router.back()}
          iconColor="#333333"
        />
        <Text
          variant="titleLarge"
          style={styles.title}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {community.name}
        </Text>
        <View style={styles.headerRight}>
          {userRole === 'admin' ? (
            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  onPress={() => setShowMenu(true)}
                  iconColor="#333333"
                />
              }
            >
              <Menu.Item
                leadingIcon="pencil"
                onPress={() => {
                  setShowMenu(false);
                  setShowEditModal(true);
                }}
                title="Edit Community"
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => {
                  setShowMenu(false);
                  handleDeleteCommunity();
                }}
                title="Delete Community"
                titleStyle={{ color: '#FF3B30' }}
              />
            </Menu>
          ) : (
            <Button
              mode={isMember ? 'outlined' : 'contained'}
              onPress={isMember ? handleLeave : handleJoin}
              style={[styles.membershipButton, { backgroundColor: isMember ? '#FFFFFF' : '#007AFF' }]}
              labelStyle={[styles.membershipButtonLabel, { color: isMember ? '#007AFF' : '#FFFFFF' }]}
            >
              {isMember ? 'Leave' : 'Join'}
            </Button>
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
          {community.cover_image ? (
            <View style={styles.coverImageContainer}>
              <Image
                source={{ uri: community.cover_image }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={styles.coverImagePlaceholder}>
              <Text style={styles.coverImagePlaceholderText}>No Cover Image</Text>
            </View>
          )}

          <View style={styles.infoContainer}>
            <Text variant="titleLarge" style={styles.communityName}>
              {community.name}
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {community.description || 'No description'}
            </Text>
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
            <View style={styles.creatorInfo}>
              <Text variant="bodyMedium" style={styles.creatorText}>
                Created by {community.creator?.full_name || community.creator?.username}
              </Text>
            </View>
          </View>
        </View>

        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Members ({memberCount})
            </Text>
            <View style={styles.membersList}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={styles.memberItem}
                  onPress={() => router.push(`/profile/${member.user_id}`)}
                >
                  <Avatar.Image
                    size={40}
                    source={{ uri: member.user.avatar_url || undefined }}
                  />
                  <View style={styles.memberInfo}>
                    <Text variant="bodyMedium" style={styles.memberName}>
                      {member.user.full_name || member.user.username}
                    </Text>
                    <Text variant="bodySmall" style={styles.memberRole}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Divider style={styles.divider} />
      </ScrollView>

      <CreatePostModal
        visible={createPostVisible}
        onDismiss={() => setCreatePostVisible(false)}
        onPost={fetchPosts}
        communityId={id}
      />

      {community && (
        <EditCommunityModal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          onUpdate={fetchCommunity}
          community={community}
        />
      )}
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
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    height: 64,
  },
  title: {
    flex: 1,
    marginHorizontal: 12,
    fontWeight: '600',
    color: '#333333',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membershipButton: {
    marginRight: 8,
    borderRadius: 20,
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  membershipButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  communityInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  coverImagePlaceholderText: {
    color: '#666666',
    fontSize: 16,
  },
  infoContainer: {
    paddingHorizontal: 8,
  },
  communityName: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 12,
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
  },
  creatorText: {
    color: '#666666',
  },
  divider: {
    marginVertical: 16,
  },
  post: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
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
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#333333',
  },
  membersList: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontWeight: '500',
    color: '#333333',
  },
  memberRole: {
    color: '#666666',
  },
});