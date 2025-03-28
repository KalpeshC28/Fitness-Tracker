// src/screens/main/CommunityScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Image, 
  FlatList, 
  Animated,
  FlatListProps
} from 'react-native';
import { Text, Button, Avatar, Card, IconButton, Divider, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Community } from '../../types/community';
import { Post } from '../../types/post';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { Video, ResizeMode } from 'expo-av';
import { EditCommunityModal } from '../../components/modals/EditCommunityModal';

interface MediaItem {
  id?: string;
  type: 'image' | 'video';
  uri: string;
}

const AnimatedFlatList = Animated.createAnimatedComponent<FlatListProps<MediaItem>>(FlatList);

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const scrollX = useRef(new Animated.Value(0)).current;

  const fetchCommunity = async () => {
    try {
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

      // Fix video URL if needed
      if (communityData?.video_url && !communityData.video_url.startsWith('http')) {
        communityData.video_url = `${supabase.storageUrl}/object/public/community_posts/community-videos/${communityData.video_url.split('/').pop()}`;
      }

      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', id)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

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
        const { data: membersData, error: membersError } = await supabase
          .from('community_members')
          .select('user_id, role')
          .eq('community_id', id)
          .neq('user_id', user?.id)
          .eq('status', 'active');

        if (membersError) throw membersError;

        if (!membersData || membersData.length === 0) {
          const { error: deleteError } = await supabase
            .from('communities')
            .delete()
            .eq('id', id)
            .eq('creator_id', user?.id);

          if (deleteError) throw deleteError;
          router.replace('/(tabs)');
          return;
        }

        const newAdmin = membersData[0];
        const { error: promoteError } = await supabase
          .from('community_members')
          .update({ role: 'admin' })
          .eq('community_id', id)
          .eq('user_id', newAdmin.user_id);

        if (promoteError) throw promoteError;

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
      // Delete associated media files before deleting the community
      if (community?.cover_image) {
        const coverFilePath = community.cover_image.split('/').pop();
        await supabase.storage.from('cover-photos').remove([coverFilePath!]);
      }

      if (community?.video_url) {
        const videoFilePath = community.video_url.split('/').pop();
        await supabase.storage.from('community_posts').remove([`community-videos/${videoFilePath!}`]);
      }

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

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error deleting community:', error);
      alert('Failed to delete community. Please try again.');
    }
  };

  useEffect(() => {
    fetchCommunity();
    fetchPosts();

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
          fetchCommunity();
        }
      )
      .subscribe();

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

  const mediaItems: MediaItem[] = [];
  if (community?.video_url) {
    mediaItems.push({ 
      id: 'video', 
      type: 'video', 
      uri: community.video_url 
    });
  }
  if (community?.cover_image) {
    mediaItems.push({ 
      id: 'image', 
      type: 'image', 
      uri: community.cover_image 
    });
  }

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <View style={styles.carouselItem}>
      {item.type === 'video' ? (
        videoError ? (
          <View style={[styles.carouselMedia, styles.errorContainer]}>
            <Text>Video failed to load</Text>
          </View>
        ) : (
          <Video
            style={styles.carouselMedia}
            source={{ uri: item.uri }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onError={() => setVideoError(true)}
            shouldPlay={false}
            isLooping={false}
          />
        )
      ) : (
        <Image
          source={{ uri: item.uri }}
          style={styles.carouselMedia}
          resizeMode="cover"
        />
      )}
    </View>
  );

  const renderDot = (index: number) => {
    const inputRange = [(index - 1) * 300, index * 300, (index + 1) * 300];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1.4, 0.8],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={index}
        style={[styles.dot, { transform: [{ scale }], opacity }]}
      />
    );
  };

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
              style={styles.media}
              source={{ uri: post.media_urls[0] }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
              isLooping={false}
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

  const timeLeft = community.offer_end_time
    ? Math.max(0, new Date(community.offer_end_time).getTime() - Date.now())
    : 0;
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

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
        {mediaItems.length > 0 ? (
          <View style={styles.carouselContainer}>
            <AnimatedFlatList
              data={mediaItems}
              renderItem={renderMediaItem}
              keyExtractor={(item, index) => item.id || index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / 300);
                setCurrentIndex(index);
              }}
            />
            {mediaItems.length > 1 && (
              <View style={styles.dotsContainer}>
                {mediaItems.map((_, index) => renderDot(index))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.coverImagePlaceholder}>
            <Text style={styles.coverImagePlaceholderText}>No Media Available</Text>
          </View>
        )}

        <Text variant="titleLarge" style={styles.communityName}>
          {community.name}
        </Text>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailText}>
            {community.is_private ? 'Private' : 'Public'}
          </Text>
          <Text style={styles.detailText}>
            {community.is_paid ? `Paid: $${community.price}` : 'Free'}
          </Text>
          <Text style={styles.detailText}>Total Members: {memberCount}</Text>
          <Text style={styles.detailText}>
            Owner: {community.creator?.full_name || community.creator?.username}
          </Text>
        </View>

        {!isMember && (
          <Button
            mode="contained"
            onPress={handleJoin}
            style={styles.joinButton}
            labelStyle={styles.joinButtonLabel}
          >
            Join Now {community.is_paid ? `$${community.discounted_price || community.price} (Save $${community.price - (community.discounted_price || community.price)})` : 'for Free'}
          </Button>
        )}

        {community.is_paid && community.seats_left && community.offer_end_time && (
          <Text style={styles.offerText}>
            Offer Limited: {community.seats_left} Seats Left
          </Text>
        )}

        {community.is_paid && community.offer_end_time && timeLeft > 0 && (
          <Text style={styles.timerText}>
            Time Left: {hours}h {minutes}m {seconds}s
          </Text>
        )}

        {(community.bonus_1 || community.bonus_2 || community.bonus_3) && (
          <View style={styles.bonusesContainer}>
            <Text style={styles.bonusesTitle}>Bonuses</Text>
            {community.bonus_1 && (
              <View style={styles.bonusItem}>
                <Text style={styles.bonusText}>{community.bonus_1}</Text>
              </View>
            )}
            {community.bonus_2 && (
              <View style={styles.bonusItem}>
                <Text style={styles.bonusText}>{community.bonus_2}</Text>
              </View>
            )}
            {community.bonus_3 && (
              <View style={styles.bonusItem}>
                <Text style={styles.bonusText}>{community.bonus_3}</Text>
              </View>
            )}
          </View>
        )}

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
  carouselContainer: {
    marginBottom: 16,
  },
  carouselItem: {
    width: 300,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  carouselMedia: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginHorizontal: 4,
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
  communityName: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  detailText: {
    color: '#666666',
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  joinButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  offerText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 8,
  },
  timerText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bonusesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  bonusesTitle: {
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  bonusItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  bonusText: {
    color: '#333333',
    fontSize: 14,
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
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});