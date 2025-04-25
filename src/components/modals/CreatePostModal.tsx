import React, { useState } from 'react';
import { View, StyleSheet, Modal, Image, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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

const { width } = Dimensions.get('window');

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
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton 
            icon="close" 
            size={24} 
            onPress={onDismiss}
            style={styles.closeButton}
          />
          <View style={styles.headerCenter}>
            <Text variant="titleMedium" style={styles.headerTitle}>Create Post</Text>
          </View>
          <Button 
            mode="contained"
            onPress={handlePost}
            loading={isLoading}
            disabled={isLoading || (!content.trim() && !mediaUri)}
            style={styles.postButton}
            labelStyle={styles.postButtonLabel}
            compact
          >
            Post
          </Button>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            placeholder="What's on your mind?"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={5}
            style={styles.input}
            disabled={isLoading}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            placeholderTextColor="#999"
          />

          {mediaUri && (
            <View style={styles.mediaPreview}>
              {mediaType === 'image' ? (
                <Image 
                  source={{ uri: mediaUri }} 
                  style={styles.previewMedia} 
                  resizeMode="contain"
                />
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
                iconColor="#fff"
              />
            </View>
          )}

          {isUploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.uploadingText}>Uploading media...</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
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
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent:'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    margin: 0,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '600',
  },
  postButton: {
    borderRadius: 20,
    marginLeft: 8,
    height: 36,
    width:70,
  },
  postButtonLabel: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
    fontSize: 16,
    minHeight: 120,
    paddingHorizontal: 0,
    paddingVertical: 16,
    lineHeight: 22,
  },
  mediaPreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  previewMedia: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: width * 0.9,
    backgroundColor: '#f5f5f5',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    margin: 0,
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  uploadingText: {
    marginTop: 8,
    color: '#666',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingBottom: 8,
  },
  footerContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addToPost: {
    marginBottom: 12,
    color: '#666',
    fontSize: 14,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  mediaButtonText: {
    color: '#666',
    fontSize: 14,
  },
});