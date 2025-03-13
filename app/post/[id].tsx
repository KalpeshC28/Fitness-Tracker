// app/post/[id].tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Avatar, Card } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Post, Comment } from '../../src/types/post';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams(); // Get the post ID from the URL
  const { supabase, user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [localIsLiked, setLocalIsLiked] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, content, media_urls, media_type, author_id, community_id, 
          likes_count, comments_count, created_at, updated_at,
          author:profiles(id, full_name, username, avatar_url),
          community:communities(id, name),
          likes(user_id),
          comments(id, content, user_id, created_at, profiles(full_name, username, avatar_url))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const enrichedPost: Post = {
          id: data.id,
          content: data.content,
          media_urls: data.media_urls || [],
          media_type: data.media_type || 'none',
          author_id: data.author_id,
          community_id: data.community_id || null,
          likes_count: data.likes_count || 0,
          comments_count: data.comments_count || 0,
          created_at: data.created_at,
          updated_at: data.updated_at,
          isLiked: data.likes.some((like: { user_id: string }) => like.user_id === user?.id),
          comments: data.comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            user_id: comment.user_id,
            created_at: comment.created_at,
            author: {
              full_name: comment.profiles?.full_name || null,
              username: comment.profiles?.username || null,
              avatar_url: comment.profiles?.avatar_url || null,
            },
          })),
          author: data.author
            ? {
                id: data.author.id,
                full_name: data.author.full_name || null,
                username: data.author.username || null,
                avatar_url: data.author.avatar_url || null,
              }
            : undefined,
          community: data.community
            ? { id: data.community.id, name: data.community.name }
            : undefined,
        };
        setPost(enrichedPost);
        setLocalLikesCount(enrichedPost.likes_count);
        setLocalIsLiked(enrichedPost.isLiked || false);
        setLocalComments(enrichedPost.comments);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !post) return;

    setLocalIsLiked(!localIsLiked);
    setLocalLikesCount(prev => (localIsLiked ? prev - 1 : prev + 1));

    try {
      if (localIsLiked) {
        await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', post.id);
      } else {
        await supabase.from('likes').insert({ user_id: user.id, post_id: post.id });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      setLocalIsLiked(post.isLiked || false);
      setLocalLikesCount(post.likes_count);
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim() || !post) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, username, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }

    const newComment: Comment = {
      id: `${Date.now()}`,
      content: commentText,
      user_id: user.id,
      created_at: new Date().toISOString(),
      author: {
        full_name: profile?.full_name || null,
        username: profile?.username || 'You',
        avatar_url: profile?.avatar_url || null,
      },
    };

    setLocalComments(prev => [...prev, newComment]);
    setCommentText('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          post_id: post.id,
          content: commentText,
        })
        .select('id, content, user_id, created_at, profiles(full_name, username, avatar_url)')
        .single();

      if (error) throw error;

      setLocalComments(prev =>
        prev.map(comment =>
          comment.id === newComment.id
            ? {
                ...comment,
                id: data.id,
                created_at: data.created_at,
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error posting comment:', error);
      setLocalComments(post.comments);
    }
  };

  if (!post) return <Text>Loading...</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[post, ...localComments]} // Combine post and comments into one list
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if ('content' in item && 'author' in item && 'media_urls' in item) {
            // Render post
            return (
              <Card style={styles.card}>
                <Card.Title
                  title={item.author?.full_name || item.author?.username || 'Unknown'}
                  subtitle={
                    item.community?.name
                      ? `Posted in ${item.community.name}`
                      : 'General'
                  }
                  left={(props) => (
                    <Avatar.Image
                      {...props}
                      size={40}
                      source={{ uri: item.author?.avatar_url || undefined }}
                    />
                  )}
                />
                <Card.Content>
                  <Text variant="bodyLarge">{item.content}</Text>
                </Card.Content>
                {item.media_urls && item.media_urls.length > 0 && (
                  item.media_type === 'image' ? (
                    <Card.Cover
                      source={{ uri: item.media_urls[0] }}
                      style={styles.fullMedia}
                    />
                  ) : item.media_type === 'video' ? (
                    <Video
                      source={{ uri: item.media_urls[0] }}
                      style={styles.fullMedia}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                      isLooping={false}
                    />
                  ) : null
                )}
                <Card.Actions>
                  <Button
                    icon={localIsLiked ? 'heart' : 'heart-outline'}
                    onPress={handleLike}
                    textColor={localIsLiked ? '#FF0000' : undefined}
                  >
                    {localLikesCount || 0}
                  </Button>
                  <Button icon="comment-outline">
                    {localComments.length || 0}
                  </Button>
                  <Button icon="share-outline">Share</Button>
                </Card.Actions>
              </Card>
            );
          } else {
            // Render comment
            const comment = item as Comment;
            return (
              <View style={styles.comment}>
                <Avatar.Image
                  size={30}
                  source={{ uri: comment.author.avatar_url || undefined }}
                />
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthor}>
                    {comment.author.username || 'Anonymous'}
                  </Text>
                  <Text>{comment.content}</Text>
                </View>
              </View>
            );
          }
        }}
        ListHeaderComponent={<Text style={styles.commentsHeader}>Comments</Text>}
        contentContainerStyle={styles.contentContainer}
      />
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Add a comment..."
        />
        <Button onPress={handleComment}>Post</Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  card: { margin: 10, backgroundColor: '#FFFFFF' },
  fullMedia: { height: 300, marginVertical: 10, borderRadius: 8 },
  contentContainer: { padding: 10 },
  comment: { flexDirection: 'row', marginBottom: 10, alignItems: 'center' },
  commentContent: { marginLeft: 10, flex: 1 },
  commentAuthor: { fontWeight: 'bold' },
  commentsHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  commentInputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginRight: 10,
  },
});