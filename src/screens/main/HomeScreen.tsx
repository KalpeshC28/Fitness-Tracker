import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Animated, TouchableWithoutFeedback, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Text, Card, Avatar, Button, IconButton, TextInput, Divider, Menu, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Post } from '../../types/post';
import { Sidebar } from '../../components/common/Sidebar';
import { useRouter } from 'expo-router';
import { neomorphShadow, glassMorphism, glowEffect } from '../../constants/theme';
import { CreatePostModal } from '../../components/modals/CreatePostModal';
import { ProfileCompletionModal } from '../../components/modals/ProfileCompletionModal';
import { useActiveCommunity } from '../../context/ActiveCommunityContext';
import { Course, CourseLesson } from '../../types/course';
import { Video, ResizeMode } from 'expo-av';
import { CreateCourseModal } from '../../components/modals/CreateCourseModal';

const SIDEBAR_WIDTH = 300;

// Add these color constants at the top of the file
const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  primary: '#007AFF',
  border: '#E0E0E0',
  text: '#666666',
};

const TABS = [
  { id: 'community', label: 'Community', icon: 'post' },
  { id: 'courses', label: 'Courses', icon: 'book-open-variant' },
  { id: 'announcements', label: 'Updates', icon: 'bell' },
  { id: 'members', label: 'Members', icon: 'account-group' },
  { id: 'settings', label: 'Settings', icon: 'cog' }
];

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
  const { activeCommunityId } = useActiveCommunity();
  const [activeCommName, setActiveCommName] = useState<string>('All Communities');
  const [activeTab, setActiveTab] = useState('community');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CourseLesson | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const fetchPosts = async () => {
    try {
      // Get the communities the user is a member of
      const { data: memberOf, error: memberError } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (memberError) throw memberError;

      // Get the community IDs the user is a member of
      const communityIds = memberOf?.map(m => m.community_id) || [];

      // Base query
      let query = supabase
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
        .order('created_at', { ascending: false });

      // If active community is selected, filter for that community
      if (activeCommunityId) {
        query = query.eq('community_id', activeCommunityId);
      } else {
        query = query.in('community_id', communityIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);

      // Update active community name
      if (activeCommunityId) {
        const community = data?.[0]?.community;
        if (community) {
          setActiveCommName(community.name);
        }
      } else {
        setActiveCommName('All Communities');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      alert('Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCourses = async () => {
    if (!activeCommunityId) return;

    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          sections:course_sections(
            *,
            lessons:course_lessons(
              id,
              title,
              description,
              video_url,
              duration,
              order_index,
              thumbnail_url
            )
          )
        `)
        .eq('community_id', activeCommunityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // console.log('Fetched courses:', data);
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      alert('Failed to load courses');
    }
  };

  const checkAdminStatus = async () => {
    if (!activeCommunityId || !user) return;

    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', activeCommunityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
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

  useEffect(() => {
    fetchPosts();
  }, [activeCommunityId]);

  useEffect(() => {
    if (activeTab === 'courses') {
      fetchCourses();
    }
  }, [activeTab, activeCommunityId]);

  useEffect(() => {
    checkAdminStatus();
  }, [activeCommunityId]);

  useEffect(() => {
    if (selectedLesson) {
      console.log('Selected lesson:', selectedLesson);
      console.log('Video URL:', selectedLesson.video_url);
    }
  }, [selectedLesson]);

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
        <Text variant="headlineSmall" style={styles.activeCommTitle}>
          {activeCommName}
        </Text>
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

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <IconButton
              icon={tab.icon}
              size={20}
              iconColor={activeTab === tab.id ? '#007AFF' : '#666666'}
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderCourseContent = () => (
    <View style={styles.courseContainer}>
      {isAdmin && (
        <Button
          mode="contained"
          icon="plus"
          onPress={() => setShowCreateCourse(true)}
          style={styles.createCourseButton}
        >
          Create Course
        </Button>
      )}

      {selectedCourse ? (
        <View style={styles.courseDetail}>
          <View style={styles.courseHeader}>
            <IconButton
              icon="arrow-left"
              onPress={() => {
                setSelectedCourse(null);
                setSelectedLesson(null);
              }}
            />
            <Text variant="headlineSmall">{selectedCourse.title}</Text>
          </View>

          {selectedLesson ? (
            <View style={styles.lessonView}>
              {/* Video Player with Thumbnail Until It Starts Playing */}
              <View style={styles.videoContainer}>
                {!isVideoPlaying && selectedLesson.thumbnail_url && (
                  <Image
                    source={{ uri: selectedLesson.thumbnail_url }}
                    style={[styles.video, styles.thumbnailOverlay]}
                    resizeMode="cover"
                  />
                )}

                <Video
                  source={{ uri: selectedLesson.video_url }}
                  useNativeControls
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  onLoadStart={() => setIsVideoPlaying(false)} // Keep thumbnail visible
                  onReadyForDisplay={() => setIsVideoPlaying(true)} // Hide thumbnail when video is ready
                  onError={(error) => {
                    console.error("Video playback error:", error);
                    alert("Error playing video");
                  }}
                />
              </View>

              <Text variant="titleMedium">{selectedLesson.title}</Text>
              <Text variant="bodyMedium">{selectedLesson.description}</Text>
            </View>
          ) : (
            <ScrollView style={styles.sectionsContainer}>
              {selectedCourse.sections?.map((section) => (
                <Card key={section.id} style={styles.sectionCard}>
                  <Card.Title title={section.title} />
                  <Card.Content>
                    {section.lessons?.map((lesson) => (
                      <TouchableOpacity
                        key={lesson.id}
                        style={styles.lessonItem}
                        onPress={() => {
                          setSelectedLesson(lesson);
                          
                        }}
                      >
                        {lesson.thumbnail_url && (
                          <Image
                            source={{ uri: lesson.thumbnail_url }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error("Image Load Error:", error);
                            }}
                          />
                        )}

                        <View style={styles.lessonInfo}>
                          <Text variant="bodyMedium">{lesson.title}</Text>
                          <Text variant="bodySmall">
                            {Math.floor(lesson.duration / 60)}:
                            {(lesson.duration % 60).toString().padStart(2, "0")}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={({ item }) => (
            <Card style={styles.courseCard} onPress={() => setSelectedCourse(item)}>
              {item.cover_image && <Card.Cover source={{ uri: item.cover_image }} />}
              <Card.Title title={item.title} subtitle={`${item.sections?.length || 0} sections`} />
              <Card.Content>
                <Text variant="bodyMedium">{item.description}</Text>
                <Text variant="bodySmall" style={styles.price}>
                  {item.price > 0 ? `$${item.price.toFixed(2)}` : "Free"}
                </Text>
              </Card.Content>
            </Card>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.courseList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge">No courses available</Text>
            </View>
          }
        />
      )}
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF', // White for header area
    },
    contentContainer: {
      flex: 1,
      backgroundColor: '#fff',
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
      paddingTop: 0,
      paddingHorizontal: 5,
    },
    card: {
      marginBottom: 10,
      marginHorizontal: 8,
      backgroundColor: colors.surface,
      marginTop: 5,
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
    activeCommTitle: {
      flex: 1,
      marginLeft: 8,
      color: '#007AFF',
    },
    tabsContainer: {
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    tabsContent: {
      paddingHorizontal: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginHorizontal: 4,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    activeTab: {
      backgroundColor: '#007AFF15',
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#666666',
      marginLeft: -4,
    },
    activeTabText: {
      color: '#007AFF',
      fontWeight: '600',
    },
    tabContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    courseContainer: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    courseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    courseList: {
      padding: 16,
      gap: 16,
    },
    courseCard: {
      marginBottom: 16,
      elevation: 2,
    },
    courseDetail: {
      flex: 1,
    },
    sectionsContainer: {
      flex: 1,
    },
    sectionCard: {
      margin: 16,
      elevation: 2,
    },
    lessonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E0E0E0',
    },
    lessonInfo: {
      flex: 1,
      marginLeft: 8,
    },
    lessonView: {
      flex: 1,
      padding: 16,
    },
    video: {
      width: '100%',
      aspectRatio: 16/9,
      marginBottom: 16,
      backgroundColor: '#000',
      borderRadius: 8,
    },
    createCourseButton: {
      margin: 16,
    },
    price: {
      marginTop: 8,
      color: '#007AFF',
      fontWeight: '600',
    },
    thumbnail: {
      width: 80,
      height: 45,
      borderRadius: 4,
      marginRight: 8,
    },
    thumbnailOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1, // Keeps the thumbnail above the video until it starts
    },
    videoContainer: {
      position: "relative",
      width: "100%",
      height: 250,
    },
    
  });

  return (
    <>
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderTabs()}
        <View style={styles.contentContainer}>
          {activeTab === 'community' ? (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.content}
              style={{ backgroundColor: '#f1f5f9', marginTop: 0 }}
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
          ) : activeTab === 'courses' ? (
            renderCourseContent()
          ) : activeTab === 'announcements' ? (
            <View style={styles.tabContent}>
              <Text variant="headlineSmall">Announcements Coming Soon</Text>
              <Text variant="bodyMedium">Community announcements will appear here</Text>
            </View>
          ) : activeTab === 'members' ? (
            <View style={styles.tabContent}>
              <Text variant="headlineSmall">Members Coming Soon</Text>
              <Text variant="bodyMedium">View and manage community members</Text>
            </View>
          ) : (
            <View style={styles.tabContent}>
              <Text variant="headlineSmall">Settings Coming Soon</Text>
              <Text variant="bodyMedium">Community settings and preferences</Text>
            </View>
          )}
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

      <CreateCourseModal
        visible={showCreateCourse}
        onDismiss={() => setShowCreateCourse(false)}
        onSuccess={() => {
          setShowCreateCourse(false);
          fetchCourses();
        }}
        communityId={activeCommunityId || ''}
      />
    </>
  );
} 