// components/homescreen/PostCard.tsx
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, TextInput } from 'react-native';
import { Card, Avatar, Button, IconButton, Menu, Text } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av'; // Import ResizeMode
import { Post, Comment } from '../../types/post';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

interface PostCardProps {
  post: Post;
  onDelete: (postId: string) => void;
  selectedPost: string | null;
  setSelectedPost: (postId: string | null) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onDelete, selectedPost, setSelectedPost }) => {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments);
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count);

  const handleLike = async () => {
    if (!user) return;

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
      setLocalIsLiked(post.isLiked);
      setLocalLikesCount(post.likes_count);
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;

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
        full_name: profile.full_name || null,
        username: profile.username || 'You',
        avatar_url: profile.avatar_url || null,
      },
    };

    setLocalComments(prev => [...prev, newComment]);
    setLocalCommentsCount(prev => prev + 1);
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
                author: {
                  full_name: profile.full_name || null,
                  username: profile.username || 'You',
                  avatar_url: profile.avatar_url || null,
                },
              }
            : comment
        )
      );
    } catch (error) {
      console.error('Error posting comment:', error);
      setLocalComments(post.comments);
      setLocalCommentsCount(post.comments_count);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Title
        title={
          <TouchableOpacity onPress={() => router.push(`/profile/${post.author_id}`)}>
            <Text style={styles.authorName}>
              {post.author?.full_name || post.author?.username}
            </Text>
          </TouchableOpacity>
        }
        subtitle={
          <TouchableOpacity onPress={() => post.community_id && router.push(`/community/${post.community_id}`)}>
            <Text style={styles.communityName}>
              {post.community?.name ? `Posted in ${post.community.name}` : 'General'}
            </Text>
          </TouchableOpacity>
        }
        left={(props) => (
          <TouchableOpacity onPress={() => router.push(`/profile/${post.author_id}`)}>
            <Avatar.Image {...props} size={40} source={{ uri: post.author?.avatar_url || undefined }} />
          </TouchableOpacity>
        )}
        right={(props) => (
          <Menu
            visible={selectedPost === post.id}
            onDismiss={() => setSelectedPost(null)}
            anchor={<IconButton {...props} icon="dots-vertical" onPress={() => setSelectedPost(post.id)} />}
          >
            {post.author_id === user?.id ? (
              <Menu.Item
                onPress={() => {
                  onDelete(post.id);
                  setSelectedPost(null);
                }}
                title="Delete"
                leadingIcon="delete"
              />
            ) : (
              <Menu.Item onPress={() => setSelectedPost(null)} title="Report" leadingIcon="flag" />
            )}
          </Menu>
        )}
      />
      <Card.Content>
        <Text variant="bodyLarge">{post.content}</Text>
      </Card.Content>
      {post.media_urls && post.media_urls.length > 0 && (
        post.media_type === 'image' ? (
          <Card.Cover source={{ uri: post.media_urls[0] }} style={styles.cardMedia} />
        ) : post.media_type === 'video' ? (
          <Video
            source={{ uri: post.media_urls[0] }}
            style={styles.cardMedia}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN} // Fixed to use ResizeMode enum
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
        <Button icon="comment-outline" onPress={() => setShowComments(!showComments)}>
          {localCommentsCount || 0}
        </Button>
        <Button icon="share-outline">Share</Button>
      </Card.Actions>
      {showComments && (
        <View style={styles.commentsContainer}>
          {localComments.map(comment => (
            <View key={comment.id} style={styles.comment}>
              <Text style={styles.commentAuthor}>{comment.author.username || 'Anonymous'}</Text>
              <Text>{comment.content}</Text>
            </View>
          ))}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
            />
            <Button onPress={handleComment}>Post</Button>
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    marginHorizontal: 8,
    backgroundColor: '#FFFFFF',
    marginTop: 5,
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
  commentsContainer: {
    padding: 10,
  },
  comment: {
    marginBottom: 10,
  },
  commentAuthor: {
    fontWeight: 'bold',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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