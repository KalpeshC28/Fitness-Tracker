import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Avatar, Card, Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ProfileCompletionModal } from '../../components/modals/ProfileCompletionModal';

interface Profile {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  interests: string | null;
  is_profile_complete: boolean;
}

export default function ProfileScreen() {
  const { signOut, user, supabase } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={{ uri: profile?.avatar_url || undefined }}
            style={styles.avatar}
          />
          <View style={styles.headerInfo}>
            <Text variant="headlineMedium" style={styles.name}>
              {profile?.full_name || 'No Name'}
            </Text>
            <Text variant="bodyLarge" style={styles.username}>
              @{profile?.username || 'username'}
            </Text>
          </View>
          <IconButton
            icon="pencil"
            size={24}
            onPress={() => setShowEditModal(true)}
            style={styles.editButton}
          />
        </View>

        {/* Bio Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Bio</Text>
            <Text variant="bodyMedium" style={styles.bio}>
              {profile?.bio || 'No bio added yet'}
            </Text>
          </Card.Content>
        </Card>

        {/* Details Section */}
        <Card style={styles.section}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Details</Text>
            
            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Location</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {profile?.location || 'Not specified'}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>Interests</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {profile?.interests || 'Not specified'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <View style={styles.actions}>
          <Button 
            mode="contained" 
            onPress={signOut}
            style={styles.signOutButton}
            buttonColor="#FF3B30"
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>

      <ProfileCompletionModal
        visible={showEditModal}
        onComplete={() => {
          setShowEditModal(false);
          fetchProfile();
        }}
        onClose={() => setShowEditModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  avatar: {
    backgroundColor: '#e1e1e1',
  },
  name: {
    fontWeight: 'bold',
  },
  username: {
    color: '#666',
  },
  editButton: {
    marginLeft: 'auto',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  bio: {
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    color: '#666',
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    marginVertical: 8,
  },
  actions: {
    padding: 16,
  },
  signOutButton: {
    marginTop: 8,
  },
}); 