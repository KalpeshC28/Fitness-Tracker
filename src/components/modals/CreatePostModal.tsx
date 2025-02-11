import React, { useState } from 'react';
import { View, StyleSheet, Modal, Image, TouchableOpacity, TouchableWithoutFeedback, Keyboard, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { TextInput, Button, IconButton, Text, Menu } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as VideoPicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPost: () => void;
  communityId?: string;
}

export function CreatePostModal({ visible, onDismiss, onPost, communityId }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('General');
  const [isLoading, setIsLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const { supabase, user } = useAuth();
  const [mediaType, setMediaType] = useState<'none' | 'image' | 'video'>('none');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMedia = async (uri: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filePath = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const contentType = uri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';

      const { error: uploadError, data } = await supabase.storage
        .from('community_posts')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community_posts')
        .getPublicUrl(filePath);

      return publicUrl;
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
          post_type: communityId ? 'community' : 'normal',
          media_urls: mediaUrl ? [mediaUrl] : [],
          media_type: mediaUri ? mediaType : 'none',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
        });

      if (error) {
        console.error('Post creation error:', error);
        throw error;
      }

      // Clear form and close modal
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

  const pickMedia = async (type: 'image' | 'video') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? 
          ImagePicker.MediaTypeOptions.Images : 
          ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setMediaUri(result.assets[0].uri);
        setMediaType(type);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      alert('Failed to pick media');
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onDismiss}
      animationType="slide"
      transparent={true}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <IconButton icon="close" onPress={onDismiss} />
              <Text variant="titleLarge">Create Post</Text>
              <Button
                mode="contained"
                onPress={handlePost}
                loading={isLoading}
                disabled={!content.trim() || isLoading}
                style={styles.postButton}
              >
                Post
              </Button>
            </View>

            <View style={styles.typeSelector}>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setMenuVisible(true)}
                    icon="chevron-down"
                    contentStyle={{ flexDirection: 'row-reverse' }}
                    style={{ width: '100%' }}
                  >
                    {postType}
                  </Button>
                }
                style={{ width: '50%' }}
              >
                <Menu.Item 
                  onPress={() => {
                    setPostType('General');
                    setMenuVisible(false);
                  }} 
                  title="General"
                  leadingIcon="text"
                />
                <Menu.Item 
                  onPress={() => {
                    setPostType('Question');
                    setMenuVisible(false);
                  }} 
                  title="Question"
                  leadingIcon="help-circle"
                />
                <Menu.Item 
                  onPress={() => {
                    setPostType('Discussion');
                    setMenuVisible(false);
                  }} 
                  title="Discussion"
                  leadingIcon="forum"
                />
              </Menu>
            </View>

            <TextInput
              mode="flat"
              placeholder="What's on your mind?"
              value={content}
              onChangeText={setContent}
              multiline
              style={styles.input}
              underlineColor="transparent"
            />

            {mediaUri && (
              <View style={styles.mediaPreview}>
                <IconButton
                  icon="close"
                  size={20}
                  style={styles.removeMedia}
                  onPress={() => {
                    setMediaUri(null);
                    setMediaType('none');
                  }}
                />
                {mediaType === 'image' ? (
                  <Image 
                    source={{ uri: mediaUri }} 
                    style={styles.previewMedia} 
                    resizeMode="cover"
                  />
                ) : (
                  <Video
                    source={{ uri: mediaUri }}
                    style={styles.previewMedia}
                    useNativeControls
                    resizeMode="contain"
                  />
                )}
              </View>
            )}

            <View style={styles.actions}>
              <View style={styles.mediaButtons}>
                <IconButton
                  icon="image"
                  size={24}
                  onPress={() => pickMedia('image')}
                />
                <IconButton
                  icon="video"
                  size={24}
                  onPress={() => pickMedia('video')}
                />
              </View>
            </View>

            {isUploading && (
              <View style={styles.uploadProgress}>
                <ActivityIndicator />
                <Text>Uploading media...</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  postButton: {
    borderRadius: 20,
  },
  typeSelector: {
    marginBottom: 16,
    zIndex: 2,
    position: 'relative',
  },
  input: {
    backgroundColor: 'transparent',
    minHeight: 120,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  mediaPreview: {
    margin: 16,
    position: 'relative',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewMedia: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
}); 