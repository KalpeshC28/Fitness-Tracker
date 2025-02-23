import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Avatar, Button, IconButton, Menu, Text } from 'react-native-paper';
import { Post } from '../../types/post';
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
  const { user } = useAuth();

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
            anchor={
              <IconButton {...props} icon="dots-vertical" onPress={() => setSelectedPost(post.id)} />
            }
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
        <Card.Cover source={{ uri: post.media_urls[0] }} style={styles.cardMedia} />
      )}
      <Card.Actions>
        <Button icon="heart-outline">{post.likes_count || 0}</Button>
        <Button icon="comment-outline">{post.comments_count || 0}</Button>
        <Button icon="share-outline">Share</Button>
      </Card.Actions>
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
});