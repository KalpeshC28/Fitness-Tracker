// components/homescreen/PostCard.tsx
import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, TextInput } from 'react-native';
import { Card, Avatar, Button, IconButton, Menu, Text } from 'react-native-paper';
import { Video, ResizeMode } from 'expo-av';
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
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments);

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

  const handlePostPress = () => {
    console.log(`navigating to ${post.id}`);
    
    router.push(`/post/${post.id}`); // Navigate to the post detail screen
  };

  return (
    <TouchableOpacity onPress={handlePostPress}>
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
            {post.comments_count || 0}
          </Button>
          <Button icon="share-outline">Share</Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
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
});