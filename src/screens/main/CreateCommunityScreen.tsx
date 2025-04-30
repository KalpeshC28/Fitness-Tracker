import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, StyleProp, ViewStyle } from 'react-native';
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        const fileSize = result.assets[0].fileSize || (await fetch(result.assets[0].uri)).headers.get('content-length');
        if (fileSize && parseInt(String(fileSize)) > MAX_FILE_SIZE) {
          alert('Image size exceeds 10MB limit');
          return;
        }
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
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const fileSize = result.assets[0].fileSize || (await fetch(result.assets[0].uri)).headers.get('content-length');
        if (fileSize && parseInt(String(fileSize)) > MAX_FILE_SIZE) {
          alert('Video size exceeds 10MB limit');
          return;
        }
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

      const normalizedUri = mediaUri.startsWith('file://') ? mediaUri : `file://${mediaUri}`;
      const fileExt = mediaUri.split('.').pop()?.toLowerCase() || (type === 'image' ? 'jpeg' : 'mp4');
      const fileName = `${type}_${communityId}_${Date.now()}.${fileExt}`;
      const bucket = type === 'image' ? 'cover-photos' : 'community_posts';
      const folderPath = type === 'video' ? 'community_videos/' : '';
      const filePath = `${folderPath}${fileName}`;

      console.log(`Uploading to bucket: ${bucket}, path: ${filePath}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(normalizedUri, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const contentType = type === 'image' ? `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}` : `video/${fileExt}`;
      console.log(`Fetched ${type} arraybuffer, size: ${arrayBuffer.byteLength} bytes, contentType: ${contentType}`);

      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError || !buckets.some((b) => b.name === bucket)) {
        throw new Error(`Bucket ${bucket} does not exist or is inaccessible`);
      }

      console.log(`Starting upload to Supabase for ${type}...`);
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error(`Supabase upload error for ${type}:`, error);
        throw error;
      }

      console.log(`Successfully uploaded ${type}. File path:`, filePath);
      return fileName;
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
      console.log('Creating community in database...');
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim(),
          creator_id: user?.id,
          is_private: isPrivate,
          is_paid: isPaid,
          price: isPaid ? parseFloat(price) || null : null,
          discounted_price: isPaid && discountedPrice ? parseFloat(discountedPrice) || null : null,
          seats_left: isPaid && seatsLeft ? parseInt(seatsLeft) || null : null,
          offer_end_time: isPaid && offerEndTime ? new Date(offerEndTime).toISOString() : null,
          bonus_1: bonus1.trim() || null,
          bonus_2: bonus2.trim() || null,
          bonus_3: bonus3.trim() || null,
          member_count: 1,
        })
        .select()
        .single();

      if (communityError) throw communityError;
      console.log('Community created with ID:', community.id);

      let coverImageUrl = null;
      let videoUrl = null;

      if (coverImage) {
        console.log('Starting cover image upload...');
        const coverImageFileName = await uploadMedia(community.id, coverImage, 'image');
        if (coverImageFileName) {
          const { data: publicUrlData } = supabase.storage
            .from('cover-photos')
            .getPublicUrl(coverImageFileName);
          coverImageUrl = publicUrlData.publicUrl;
          console.log('Cover image uploaded, public URL:', coverImageUrl);
        }
      }

      if (video) {
        console.log('Starting video upload...');
        const videoFileName = await uploadMedia(community.id, video, 'video');
        if (videoFileName) {
          const { data: publicUrlData } = supabase.storage
            .from('community_posts')
            .getPublicUrl(`community_videos/${videoFileName}`);
          videoUrl = publicUrlData.publicUrl;
          console.log('Video uploaded, public URL:', videoUrl);
        }
      }

      const updates: any = {};
      if (coverImageUrl) updates.cover_image = coverImageUrl;
      if (videoUrl) updates.video_url = videoUrl;

      if (Object.keys(updates).length > 0) {
        console.log('Updating community with media URLs:', updates);
        await supabase
          .from('communities')
          .update(updates)
          .eq('id', community.id);
      }

      console.log('Adding creator as admin...');
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user?.id,
          role: 'admin',
          status: 'active',
          joined_at: new Date().toISOString(),
        });

      console.log('Community creation completed successfully');
      setName('');
      setDescription('');
      setIsPrivate(false);
      setIsPaid(false);
      setPrice('');
      setDiscountedPrice('');
      setSeatsLeft('');
      setOfferEndTime('');
      setBonus1('');
      setBonus2('');
      setBonus3('');
      setCoverImage(null);
      setVideo(null);
      router.back();
      alert('Community created successfully!');
    } catch (error) {
      console.error('Error creating community:', error);
      alert(`Failed to create community: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const removeImageStyle: StyleProp<ViewStyle> = {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              style={removeImageStyle}
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
              contentFit={VideoContentFit.CONTAIN ?? "contain"}
            />
            <IconButton
              icon="close"
              size={20}
              style={removeImageStyle}
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
    // IDENTITY
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
});