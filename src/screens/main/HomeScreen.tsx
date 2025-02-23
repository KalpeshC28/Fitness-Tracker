// HomeScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Animated, TouchableWithoutFeedback, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
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

const SIDEBAR_WIDTH = 300;

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
    };
    checkAdminStatus();
  }, [activeCommunityId]);

  const toggleDrawer = (open: boolean) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: open ? 0 : -SIDEBAR_WIDTH, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: open ? 0.5 : 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setIsDrawerOpen(open));
  };

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    fetchPosts();
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchPosts} />}
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
        return <Text variant="headlineSmall">Announcements Coming Soon</Text>;
      case 'members':
        return <Text variant="headlineSmall">Members Coming Soon</Text>;
      case 'settings':
        return <Text variant="headlineSmall">Settings Coming Soon</Text>;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header activeCommName={activeCommName} onMenuPress={() => toggleDrawer(true)} />
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
});