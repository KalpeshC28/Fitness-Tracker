// HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Animated, TouchableWithoutFeedback, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Avatar, Card, Switch } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { usePosts } from '../../hooks/usePosts';
import { useCourses } from '../../hooks/useCourses';
import { useActiveCommunity } from '../../context/ActiveCommunityContext';
import { PostCard } from '../../components/homescreen/PostCard';
import { CourseContent } from '../../components/homescreen/CourseContent';
import { Header } from '../../components/homescreen/Header';
import { Tabs } from '../../components/homescreen/Tabs';
import { Sidebar } from '../../components/common/Sidebar';
import { ProfileCompletionModal } from '../../components/modals/ProfileCompletionModal';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { router } from 'expo-router';

const SIDEBAR_WIDTH = 300;

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

export default function HomeScreen() {
  const { supabase, user } = useAuth();
  const { posts, loading, refreshing, fetchPosts, activeCommName } = usePosts();
  const { courses, fetchCourses } = useCourses();
  const { activeCommunityId } = useActiveCommunity();
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [activeTab, setActiveTab] = useState('community');
  const [isAdmin, setIsAdmin] = useState(false);
  const [createPostVisible, setCreatePostVisible] = useState(false);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // For mute notifications
  const [userRole, setUserRole] = useState<'member' | 'admin' | null>(null);
  const [isMember, setIsMember] = useState(false)

  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_profile_complete')
        .eq('id', user.id)
        .single();
      if (!data?.is_profile_complete) setShowProfileCompletion(true);
    };
    checkProfileCompletion();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'courses' && activeCommunityId) fetchCourses();
    fetchPosts(activeTab);
    if (activeTab === 'members' || activeTab === 'settings') fetchMembers(); // Fetch members for members and settings tabs
  }, [activeTab, activeCommunityId]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!activeCommunityId || !user) return;
      const { data } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', activeCommunityId)
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
      setUserRole(data?.role as 'member' | 'admin' | null);
      setIsMember(!!data); // Set membership status
    };
    checkAdminStatus();
  }, [activeCommunityId]);

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', activeCommunityId)
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
            avatar_url: profile?.avatar_url
          }
        };
      });

      setMembers(transformedMembers);
      setMemberCount(transformedMembers.length);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const toggleDrawer = (open: boolean) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: open ? 0 : -SIDEBAR_WIDTH, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: open ? 0.5 : 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setIsDrawerOpen(open));
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    fetchPosts(activeTab);
  };

  const handleLeaveCommunity = () => {
    if (!activeCommunityId || !user) return;

    Alert.alert(
      'Leave Community',
      'Are you sure you want to leave this community?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              if (userRole === 'admin') {
                const { data: membersData, error: membersError } = await supabase
                  .from('community_members')
                  .select('user_id, role')
                  .eq('community_id', activeCommunityId)
                  .neq('user_id', user.id)
                  .eq('status', 'active');

                if (membersError) throw membersError;

                if (!membersData || membersData.length === 0) {
                  const { error: deleteError } = await supabase
                    .from('communities')
                    .delete()
                    .eq('id', activeCommunityId)
                    .eq('creator_id', user.id);

                  if (deleteError) throw deleteError;
                  router.replace('/(tabs)');
                  return;
                }

                const newAdmin = membersData[0];
                const { error: promoteError } = await supabase
                  .from('community_members')
                  .update({ role: 'admin' })
                  .eq('community_id', activeCommunityId)
                  .eq('user_id', newAdmin.user_id);

                if (promoteError) throw promoteError;

                const { error: updateCreatorError } = await supabase
                  .from('communities')
                  .update({ creator_id: newAdmin.user_id })
                  .eq('id', activeCommunityId);

                if (updateCreatorError) throw updateCreatorError;
              }

              const { error: leaveError } = await supabase
                .from('community_members')
                .delete()
                .eq('community_id', activeCommunityId)
                .eq('user_id', user.id);

              if (leaveError) throw leaveError;

              router.replace('/(tabs)');
            } catch (error) {
              console.error('Error leaving community:', error);
              Alert.alert('Error', 'Failed to leave community');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const toggleMuteNotifications = () => {
    setIsMuted(prev => !prev);
    // TODO: Implement actual notification muting logic (e.g., update a user-community settings table)
    console.log('Notifications muted:', !isMuted);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'community':
        return (
          <FlatList
            data={posts}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                onDelete={handleDeletePost}
                selectedPost={selectedPost}
                setSelectedPost={setSelectedPost}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts('community')} />}
            ListEmptyComponent={<Text variant="bodyLarge">No posts yet</Text>}
          />
        );
      case 'courses':
        return (
          <CourseContent
            courses={courses}
            isAdmin={isAdmin}
            communityId={activeCommunityId || ''}
            onCourseUpdate={fetchCourses}
          />
        );
      case 'announcements':
        return (
          <>
            {isAdmin && (
              <Button
                mode="contained"
                icon="plus"
                onPress={() => setCreatePostVisible(true)}
                style={styles.createPostButton}
              >
                Post Update
              </Button>
            )}
            <FlatList
              data={posts}
              renderItem={({ item }) => (
                <PostCard
                  post={item}
                  onDelete={handleDeletePost}
                  selectedPost={selectedPost}
                  setSelectedPost={setSelectedPost}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.content}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts('announcements')} />}
              ListEmptyComponent={<Text variant="bodyLarge">No updates yet</Text>}
            />
          </>
        );
      case 'members':
        if (!activeCommunityId) return <Text variant="bodyLarge">Select a community to view members</Text>;
        const admins = members.filter(m => m.role === 'admin');
        const regularMembers = members.filter(m => m.role === 'member');
        return (
          <ScrollView contentContainerStyle={styles.membersContainer}>
            <Card style={styles.section}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Members ({memberCount})
                </Text>
                {admins.length > 0 && (
                  <>
                    <Text variant="bodyLarge" style={styles.subSectionTitle}>Admins</Text>
                    <View style={styles.membersList}>
                      {admins.map((member) => (
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
                  </>
                )}
                {regularMembers.length > 0 && (
                  <>
                    <Text variant="bodyLarge" style={styles.subSectionTitle}>Members</Text>
                    <View style={styles.membersList}>
                      {regularMembers.map((member) => (
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
                  </>
                )}
                {members.length === 0 && (
                  <Text variant="bodyLarge">No members yet</Text>
                )}
              </Card.Content>
            </Card>
          </ScrollView>
        );
      case 'settings':
        if (!activeCommunityId) return <Text variant="bodyLarge">Select a community to view settings</Text>;
        return (
          <ScrollView contentContainerStyle={styles.settingsContainer}>
            <Card style={styles.section}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
                
                <View style={styles.settingItem}>
                  <Text variant="bodyLarge">Membership Info</Text>
                  <Text variant="bodyMedium" style={styles.settingText}>
                    {isMember 
                      ? `You are a${isAdmin ? 'n admin' : ' member'} of this community since ${members.find(m => m.user_id === user?.id)?.joined_at.split('T')[0] || 'unknown date'}`
                      : 'You are not a member of this community'}
                  </Text>
                </View>

                {isMember && (
                  <>
                    <View style={styles.settingItem}>
                      <Text variant="bodyLarge">Mute Notifications</Text>
                      <Switch
                        value={isMuted}
                        onValueChange={toggleMuteNotifications}
                        style={styles.switch}
                      />
                    </View>

                    <Button
                      mode="outlined"
                      onPress={handleLeaveCommunity}
                      style={styles.leaveButton}
                      textColor="#FF3B30"
                    >
                      Leave Community
                    </Button>
                  </>
                )}
              </Card.Content>
            </Card>
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header activeCommName={activeCommName} activeCommunityId={activeCommunityId} onMenuPress={() => toggleDrawer(true)} />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {isDrawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback onPress={() => toggleDrawer(false)}>
            <View style={styles.overlayTouch} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
        <Sidebar />
      </Animated.View>

      <ProfileCompletionModal
        visible={showProfileCompletion}
        onComplete={() => setShowProfileCompletion(false)}
        onClose={() => setShowProfileCompletion(false)}
      />

      {activeTab === 'announcements' && activeCommunityId && (
        <CreatePostModal
          visible={createPostVisible}
          onDismiss={() => setCreatePostVisible(false)}
          onPost={() => fetchPosts('announcements')}
          communityId={activeCommunityId}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { flex: 1, backgroundColor: '#fff' },
  content: { paddingTop: 0, paddingHorizontal: 5 },
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    zIndex: 1 
  },
  overlayTouch: { flex: 1, width: '100%', height: '100%' },
  sidebar: { 
    position: 'absolute', 
    left: 0, 
    top: 0, 
    bottom: 0, 
    width: SIDEBAR_WIDTH, 
    backgroundColor: '#FFFFFF', 
    zIndex: 2 
  },
  createPostButton: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  membersContainer: {
    padding: 8,
  },
  settingsContainer: {
    padding: 8,
  },
  section: {
    marginHorizontal: 8,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subSectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
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
  },
  memberRole: {
    color: '#666',
  },
  settingItem: {
    marginVertical: 12,
  },
  settingText: {
    color: '#666',
    marginTop: 4,
  },
  switch: {
    marginTop: 8,
  },
  leaveButton: {
    marginTop: 16,
    borderColor: '#FF3B30',
  },
});