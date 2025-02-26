// components/homescreen/Header.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton, Divider } from 'react-native-paper';
import { router } from 'expo-router';

interface HeaderProps {
  activeCommName: string;
  activeCommunityId?: string; // Optional community ID for navigation
  onMenuPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeCommName, activeCommunityId, onMenuPress }) => {
  const handleCommunityPress = () => {
    if (activeCommunityId) {
      router.push(`/community/${activeCommunityId}`);
    }
  };

  return (
    <>
      <View style={styles.header}>
        <IconButton icon="menu" size={26} onPress={onMenuPress} />
        <TouchableOpacity onPress={handleCommunityPress} disabled={!activeCommunityId}>
          <Text variant="headlineSmall" style={styles.activeCommTitle}>
            {activeCommName}
          </Text>
        </TouchableOpacity>
      </View>
      <Divider style={styles.divider} />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  activeCommTitle: {
    flex: 1,
    marginLeft: 8,
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});