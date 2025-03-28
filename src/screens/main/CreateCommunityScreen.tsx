// src/screens/main/CreateCommunity.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { TextInput, Button, Switch, Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, VideoContentFit } from 'expo-video';

export default function CreateCommunityScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [seatsLeft, setSeatsLeft] = useState('');
  const [offerEndTime, setOfferEndTime] = useState('');
  const [bonus1, setBonus1] = useState('');
  const [bonus2, setBonus2] = useState('');
  const [bonus3, setBonus3] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { supabase, user } = useAuth();

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

  const uploadMedia = async (communityId: string, mediaUri: string, type: 'image' | 'video') => {
    if (!mediaUri) return null;
  
    try {
      console.log(`Uploading ${type} with URI:`, mediaUri);
  
      if (!mediaUri.startsWith('file://')) {
        throw new Error(`Invalid ${type} URI: Must be a local file path (file://)`);
      }
  
      const fileExt = mediaUri.split('.').pop()?.toLowerCase() || 
                     (type === 'image' ? 'jpg' : 'mp4');
      const fileName = `${type}_${communityId}_${Date.now()}.${fileExt}`;
      
      // Correct bucket names based on your screenshot
      const bucket = type === 'image' ? 'cover-photos' : 'community_posts';
      const folderPath = type === 'video' ? 'community-videos/' : '';
      const filePath = `${folderPath}${fileName}`;
  
      // Use Supabase JS client for upload
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, {
          uri: mediaUri,
          name: fileName,
          type: type === 'image' ? `image/${fileExt}` : `video/${fileExt}`,
        } as any, {
          contentType: type === 'image' ? `image/${fileExt}` : `video/${fileExt}`,
          upsert: false,
        });
  
      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }
  
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
  
      if (!publicUrl) {
        throw new Error(`Failed to get public URL for ${type}`);
      }
  
      console.log(`Successfully uploaded ${type}. Public URL:`, publicUrl);
      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      throw error;
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a community name');
      return;
    }
  
    setLoading(true);
    try {
      // First create the community without media
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim(),
          creator_id: user?.id,
          is_private: isPrivate,
          is_paid: isPaid,
          price: isPaid ? parseFloat(price) : null,
          discounted_price: isPaid && discountedPrice ? parseFloat(discountedPrice) : null,
          seats_left: isPaid && seatsLeft ? parseInt(seatsLeft) : null,
          offer_end_time: isPaid && offerEndTime ? new Date(offerEndTime).toISOString() : null,
          bonus_1: bonus1.trim() || null,
          bonus_2: bonus2.trim() || null,
          bonus_3: bonus3.trim() || null,
          member_count: 1,
        })
        .select()
        .single();
  
      if (communityError) throw communityError;
  
      // Upload media in parallel
      const [coverImageUrl, videoUrl] = await Promise.all([
        coverImage ? uploadMedia(community.id, coverImage, 'image') : Promise.resolve(null),
        video ? uploadMedia(community.id, video, 'video') : Promise.resolve(null)
      ]);
  
      // Update community with media URLs if they exist
      const updates: any = {};
      if (coverImageUrl) updates.cover_image = coverImageUrl;
      if (videoUrl) updates.video_url = videoUrl;
  
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('communities')
          .update(updates)
          .eq('id', community.id);
      }
  
      // Add creator as admin
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user?.id,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString()
        });
  
      router.back();
      alert('Community created successfully!');
    } catch (error) {
      console.error('Error creating community:', error);
      alert(`Failed to create community: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          onPress={() => router.back()} 
        />
        <Text variant="headlineSmall">Create Community</Text>
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim() || loading}
        >
          Create
        </Button>
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          label="Community Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="words"
        />

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          multiline
          numberOfLines={4}
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
            />
            <TextInput
              label="Discounted Price ($)"
              value={discountedPrice}
              onChangeText={setDiscountedPrice}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Seats Left"
              value={seatsLeft}
              onChangeText={setSeatsLeft}
              style={styles.input}
              keyboardType="numeric"
            />
            <TextInput
              label="Offer End Time (YYYY-MM-DD HH:MM)"
              value={offerEndTime}
              onChangeText={setOfferEndTime}
              style={styles.input}
              placeholder="e.g., 2025-12-31 23:59"
            />
          </>
        )}

        <TextInput
          label="Bonus 1"
          value={bonus1}
          onChangeText={setBonus1}
          style={styles.input}
        />
        <TextInput
          label="Bonus 2"
          value={bonus2}
          onChangeText={setBonus2}
          style={styles.input}
        />
        <TextInput
          label="Bonus 3"
          value={bonus3}
          onChangeText={setBonus3}
          style={styles.input}
        />

        <Button
          mode="outlined"
          onPress={pickImage}
          icon="image"
          style={styles.imageButton}
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
            />
          </View>
        )}

        <Button
          mode="outlined"
          onPress={pickVideo}
          icon="video"
          style={styles.imageButton}
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
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  imageButton: {
    marginBottom: 16,
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