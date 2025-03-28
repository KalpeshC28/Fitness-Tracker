// src/components/modals/EditCommunityModal.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, IconButton, Switch } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { Community } from '../../types/community';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, VideoContentFit } from 'expo-video';
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
  const [isPrivate, setIsPrivate] = useState(community.is_private);
  const [isPaid, setIsPaid] = useState(community.is_paid || false);
  const [price, setPrice] = useState(community.price?.toString() || '');
  const [discountedPrice, setDiscountedPrice] = useState(community.discounted_price?.toString() || '');
  const [seatsLeft, setSeatsLeft] = useState(community.seats_left?.toString() || '');
  const [offerEndTime, setOfferEndTime] = useState(community.offer_end_time || '');
  const [bonus1, setBonus1] = useState(community.bonus_1 || '');
  const [bonus2, setBonus2] = useState(community.bonus_2 || '');
  const [bonus3, setBonus3] = useState(community.bonus_3 || '');
  const [coverImage, setCoverImage] = useState<string | null>(community.cover_image || null);
  const [video, setVideo] = useState<string | null>(community.video_url || null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
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

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setVideo(result.assets[0].uri);
        console.log('Selected video URI:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      alert('Failed to pick video');
    }
  };

  const uploadMedia = async (mediaUri: string, type: 'image' | 'video') => {
    try {
      console.log(`Uploading ${type} with URI:`, mediaUri);
  
      if (!mediaUri.startsWith('file://')) {
        throw new Error(`Invalid ${type} URI: Must be a local file path (file://)`);
      }
  
      const fileExt = mediaUri.split('.').pop()?.toLowerCase() || 
                     (type === 'image' ? 'jpg' : 'mp4');
      const fileName = `${type}_${community.id}_${Date.now()}.${fileExt}`;
      
      // Correct bucket name with underscore
      const bucket = 'community_posts';
      const folderPath = 'community-videos/'; // Folder for videos
      const filePath = type === 'video' ? `${folderPath}${fileName}` : fileName;
  
      // Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: mediaUri,
        name: fileName,
        type: type === 'image' ? `image/${fileExt}` : `video/${fileExt}`,
      } as any);
  
      // Get session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');
  
      // Upload using Supabase JS client
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, formData, {
          contentType: type === 'image' ? `image/${fileExt}` : `video/${fileExt}`,
          upsert: false,
        });
  
      if (error) throw error;
  
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
  
      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
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
        is_private: isPrivate,
        is_paid: isPaid,
        price: isPaid ? parseFloat(price) : null,
        discounted_price: isPaid && discountedPrice ? parseFloat(discountedPrice) : null,
        seats_left: isPaid && seatsLeft ? parseInt(seatsLeft) : null,
        offer_end_time: isPaid && offerEndTime ? new Date(offerEndTime).toISOString() : null,
        bonus_1: bonus1.trim() || null,
        bonus_2: bonus2.trim() || null,
        bonus_3: bonus3.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (coverImage && coverImage !== community.cover_image) {
        const coverImageUrl = await uploadMedia(coverImage, 'image');
        updates.cover_image = coverImageUrl;

        if (community.cover_image) {
          const oldFilePath = community.cover_image.split('/').pop();
          await supabase.storage.from('cover-photos').remove([oldFilePath!]);
        }
      } else if (coverImage === null && community.cover_image) {
        const oldFilePath = community.cover_image.split('/').pop();
        await supabase.storage.from('cover-photos').remove([oldFilePath!]);
        updates.cover_image = null;
      }

      if (video && video !== community.video_url) {
        const videoUrl = await uploadMedia(video, 'video');
        updates.video_url = videoUrl;

        if (community.video_url) {
          const oldFilePath = community.video_url.split('/').pop();
          await supabase.storage.from('community-posts').remove([`community-videos/${oldFilePath!}`]);
        }
      } else if (video === null && community.video_url) {
        const oldFilePath = community.video_url.split('/').pop();
        await supabase.storage.from('community-posts').remove([`community-videos/${oldFilePath!}`]);
      }

      const { error } = await supabase
        .from('communities')
        .update(updates)
        .eq('id', community.id);

      if (error) {
        console.error('Error updating community in Supabase:', error);
        throw error;
      }

      onUpdate();
      onDismiss();
    } catch (error) {
      console.error('Error updating community:', error);
      alert('Failed to update community: ' + (error.message || 'Unknown error'));
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

          <View style={styles.switchContainer}>
            <Text>Private Community</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
            />
          </View>

          <View style={styles.switchContainer}>
            <Text>Paid Community</Text>
            <Switch
              value={isPaid}
              onValueChange={setIsPaid}
            />
          </View>

          {isPaid && (
            <>
              <TextInput
                label="Price ($)"
                value={price}
                onChangeText={setPrice}
                style={styles.input}
                keyboardType="numeric"
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#007AFF"
              />
              <TextInput
                label="Discounted Price ($)"
                value={discountedPrice}
                onChangeText={setDiscountedPrice}
                style={styles.input}
                keyboardType="numeric"
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#007AFF"
              />
              <TextInput
                label="Seats Left"
                value={seatsLeft}
                onChangeText={setSeatsLeft}
                style={styles.input}
                keyboardType="numeric"
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#007AFF"
              />
              <TextInput
                label="Offer End Time (YYYY-MM-DD HH:MM)"
                value={offerEndTime}
                onChangeText={setOfferEndTime}
                style={styles.input}
                placeholder="e.g., 2025-12-31 23:59"
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#007AFF"
              />
            </>
          )}

          <TextInput
            label="Bonus 1"
            value={bonus1}
            onChangeText={setBonus1}
            style={styles.input}
            mode="outlined"
            outlineColor="#E0E0E0"
            activeOutlineColor="#007AFF"
          />
          <TextInput
            label="Bonus 2"
            value={bonus2}
            onChangeText={setBonus2}
            style={styles.input}
            mode="outlined"
            outlineColor="#E0E0E0"
            activeOutlineColor="#007AFF"
          />
          <TextInput
            label="Bonus 3"
            value={bonus3}
            onChangeText={setBonus3}
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

          <Button
            mode="outlined"
            onPress={pickVideo}
            icon="video"
            style={styles.imageButton}
            labelStyle={styles.imageButtonLabel}
          >
            {video ? 'Change Video' : 'Add Video'}
          </Button>

          {video && (
            <View style={styles.imagePreview}>
              <VideoView
                style={styles.previewImage}
                source={{ uri: video }}
                useNativeControls
                contentFit={VideoContentFit?.CONTAIN ?? "contain"}
              />
              <IconButton
                icon="close"
                size={20}
                style={styles.removeImage}
                onPress={() => setVideo(null)}
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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