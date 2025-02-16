import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/png?seed=1',
  'https://api.dicebear.com/7.x/avataaars/png?seed=2',
  'https://api.dicebear.com/7.x/avataaars/png?seed=3',
  'https://api.dicebear.com/7.x/avataaars/png?seed=4',
  'https://api.dicebear.com/7.x/avataaars/png?seed=5',
  'https://api.dicebear.com/7.x/avataaars/png?seed=6',
];

interface ProfileCompletionModalProps {
  visible: boolean;
  onComplete: () => void;
  onClose: () => void;
}

export function ProfileCompletionModal({ visible, onComplete, onClose }: ProfileCompletionModalProps) {
  const { supabase, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: '',
    location: '',
    interests: '',
  });

  const handleSubmit = async () => {
    if (!formData.full_name || !formData.username) {
      alert('Full name and username are required');
      return;
    }

    setLoading(true);
    try {
      // Update the profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          bio: formData.bio,
          location: formData.location,
          interests: formData.interests,
          avatar_url: selectedAvatar,
          is_profile_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;
      onComplete();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
          />
          <Text variant="headlineMedium" style={styles.title}>Complete Your Profile</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Choose an Avatar</Text>
          <ScrollView horizontal style={styles.avatarList}>
            {AVATAR_OPTIONS.map((avatar, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedAvatar(avatar)}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar && styles.selectedAvatar
                ]}
              >
                <Image source={{ uri: avatar }} style={styles.avatar} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            label="Full Name *"
            value={formData.full_name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
            style={styles.input}
          />

          <TextInput
            label="Username *"
            value={formData.username}
            onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
            style={styles.input}
          />

          <TextInput
            label="Bio"
            value={formData.bio}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <TextInput
            label="Location"
            value={formData.location}
            onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
            style={styles.input}
          />

          <TextInput
            label="Interests (comma separated)"
            value={formData.interests}
            onChangeText={(text) => setFormData(prev => ({ ...prev, interests: text }))}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          >
            Complete Profile
          </Button>
        </ScrollView>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    left: 8,
    top: 46,
    zIndex: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  avatarList: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatarOption: {
    marginRight: 12,
    borderRadius: 50,
    padding: 2,
  },
  selectedAvatar: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  button: {
    marginTop: 24,
    marginBottom: 40,
  },
}); 