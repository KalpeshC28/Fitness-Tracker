//src/screens/main/CreateCommunnity.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { TextInput, Button, Switch, Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

export default function CreateCommunityScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { supabase, user } = useAuth();

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a community name');
      return;
    }

    setLoading(true);
    try {
      // Create the community
      const { data: community, error: communityError } = await supabase
        .from('communities')
        .insert({
          name: name.trim(),
          description: description.trim(),
          creator_id: user?.id,
          is_private: isPrivate,
          member_count: 1, // Creator is first member
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: user?.id,
          role: 'admin',
          joined_at: new Date().toISOString(),
          status: 'active',
        });

      if (memberError) throw memberError;

      // Success - navigate back
      router.back();
      alert('Community created successfully!');
    } catch (error) {
      console.error('Error creating community:', error);
      alert('Failed to create community. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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