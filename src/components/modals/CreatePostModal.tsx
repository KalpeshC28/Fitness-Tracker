import React, { useState } from 'react';
import { View, StyleSheet, Modal, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPost: () => void;
  communityId?: string;
}

export function CreatePostModal({ visible, onDismiss, onPost, communityId }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { supabase, user } = useAuth();

  const uploadMedia = async (uri: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const { error: uploadError } = await supabase.storage
        .from('community_posts')
        .upload(filePath, decode(base64), {
          contentType: mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('community_posts')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !mediaUri) return;

    setIsLoading(true);
    try {
      let mediaUrl = null;
      if (mediaUri) {
        mediaUrl = await uploadMedia(mediaUri);
        if (!mediaUrl) {
          alert('Failed to upload media');
          return;
        }
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          content: content.trim(),
          author_id: user?.id,
          community_id: communityId,
          media_urls: mediaUrl ? [mediaUrl] : [],
          media_type: mediaType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
        });

      if (error) throw error;

      setContent('');
      setMediaUri(null);
      setMediaType('none');
      onPost();
      onDismiss();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('image');
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <IconButton 
            icon="close" 
            size={24} 
            onPress={onDismiss}
          />
          <Text variant="titleLarge" style={styles.headerTitle}>Create Post</Text>
          <Button 
            mode="contained"
            onPress={handlePost}
            loading={isLoading}
            disabled={isLoading || (!content.trim() && !mediaUri)}
            style={styles.postButton}
          >
            Post
          </Button>
        </View>

        <ScrollView style={styles.content}>
          <TextInput
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            style={styles.input}
            disabled={isLoading}
          />

          {mediaUri && (
            <View style={styles.mediaPreview}>
              {mediaType === 'image' ? (
                <Image source={{ uri: mediaUri }} style={styles.previewMedia} />
              ) : (
                <Video
                  source={{ uri: mediaUri }}
                  style={styles.previewMedia}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              )}
              <IconButton
                icon="close-circle"
                size={24}
                onPress={() => {
                  setMediaUri(null);
                  setMediaType('none');
                }}
                style={styles.removeMedia}
              />
            </View>
          )}

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" />
              <Text>Uploading media...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={styles.addToPost}>Add to your post</Text>
          <View style={styles.mediaButtons}>
            <TouchableOpacity 
              style={styles.mediaButton} 
              onPress={pickImage}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
              <Text style={styles.mediaButtonText}>Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaButton} 
              onPress={pickVideo}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="video" size={24} color="#F44336" />
              <Text style={styles.mediaButtonText}>Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 16,
  },
  postButton: {
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 16,
    minHeight: 120,
  },
  mediaPreview: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  previewMedia: {
    width: '100%',
    height: 300,
    backgroundColor: '#f5f5f5',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addToPost: {
    marginBottom: 12,
    color: '#666',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  mediaButtonText: {
    color: '#666',
  },
}); 