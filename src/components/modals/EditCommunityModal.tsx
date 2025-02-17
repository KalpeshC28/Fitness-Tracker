import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Text, TextInput, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { Community } from '../../types/community';

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
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!name.trim()) {
      alert('Community name is required');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('communities')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
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
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton 
            icon="close" 
            size={24} 
            onPress={onDismiss}
          />
          <Text variant="titleLarge" style={styles.title}>Edit Community</Text>
          <Button
            mode="contained"
            onPress={handleUpdate}
            loading={loading}
            disabled={!name.trim() || loading}
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
          />

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.input}
          />
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    flex: 1,
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
}); 