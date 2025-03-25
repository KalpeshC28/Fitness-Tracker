// src/components/modals/EditCommunityModal.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { Community } from '../../types/community';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EditCommunityModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpdate: () => void;
  community: Community;
}

export function EditCommunityModal({ visible, onDismiss, onUpdate, community }: EditCommunityModalProps) {
  const { supabase } = useAuth();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description || '');
  const [coverImage, setCoverImage] = useState<string | null>(community.cover_image || null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Use string array for compatibility
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image');
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      alert('Community name is required');
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        name: name.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      // If a new cover image is selected, upload it to Supabase storage
      if (coverImage && coverImage !== community.cover_image) {
        // Read the image as a Base64 string
        const base64 = await FileSystem.readAsStringAsync(coverImage, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert Base64 to ArrayBuffer
        const arrayBuffer = decode(base64);

        // Generate a unique file name
        const fileExt = coverImage.split('.').pop();
        const fileName = `${community.id}-${Date.now()}.${fileExt}`;
        const filePath = `cover-photos/${fileName}`; // Organize in a folder within the bucket

        // Upload to the community_posts bucket
        const { error: uploadError } = await supabase.storage
          .from('community_posts') // Matches your existing bucket
          .upload(filePath, arrayBuffer, {
            contentType: `image/${fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('community_posts')
          .getPublicUrl(filePath);

        updates.cover_image = publicUrlData.publicUrl;
      } else if (coverImage === null && community.cover_image) {
        // If the cover image is removed, delete the old image from storage
        const oldFilePath = community.cover_image.split('/').pop();
        await supabase.storage.from('community_posts').remove([oldFilePath]);
        updates.cover_image = null;
      }

      const { error } = await supabase
        .from('communities')
        .update(updates)
        .eq('id', community.id);

      if (error) throw error;

      onUpdate();
      onDismiss();
    } catch (error) {
      console.error('Error updating community:', error);
      alert('Failed to update community');
    } finally {
      setLoading(false);
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
            iconColor="#333333"
          />
          <Text variant="titleLarge" style={styles.title}>Edit Community</Text>
          <Button
            mode="contained"
            onPress={handleUpdate}
            loading={loading}
            disabled={!name.trim() || loading}
            style={styles.saveButton}
            labelStyle={styles.saveButtonLabel}
          >
            Save
          </Button>
        </View>

        <ScrollView style={styles.content}>
          <TextInput
            label="Community Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            autoCapitalize="words"
            mode="outlined"
            outlineColor="#E0E0E0"
            activeOutlineColor="#007AFF"
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.input}
            mode="outlined"
            outlineColor="#E0E0E0"
            activeOutlineColor="#007AFF"
          />

          <Button
            mode="outlined"
            onPress={pickImage}
            icon="image"
            style={styles.imageButton}
            labelStyle={styles.imageButtonLabel}
          >
            {coverImage ? 'Change Cover Image' : 'Add Cover Image'}
          </Button>

          {coverImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: coverImage }} style={styles.previewImage} />
              <IconButton
                icon="close"
                size={20}
                style={styles.removeImage}
                onPress={() => setCoverImage(null)}
                iconColor="#FFFFFF"
              />
            </View>
          )}
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  saveButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  imageButton: {
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 16,
  },
  imageButtonLabel: {
    color: '#007AFF',
    fontSize: 16,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});