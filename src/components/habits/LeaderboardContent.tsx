// src/components/habits/LeaderboardContent.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';

const LeaderboardContent: React.FC<{ communityId: string }> = ({ communityId }) => {
  const { supabase, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (membersError) throw membersError;

      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData.find(p => p.id === member.user_id);
        return {
          ...member,
          full_name: profile?.full_name || profile?.username || 'Unknown',
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
        };
      });

      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, points');

      if (pointsError) throw pointsError;

      const leaderboardData = membersWithProfiles.map(member => {
        const pointsEntry = pointsData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          points: pointsEntry?.points || 0,
        };
      });

      leaderboardData.sort((a, b) => b.points - a.points);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message);
    }
  };

  const getRankLabel = (position: number) => {
    switch (position) {
      case 0:
        return 'Gold';
      case 1:
        return 'Silver';
      case 2:
        return 'Bronze';
      default:
        return 'Regular';
    }
  };

  const formatName = (fullName: string) => {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0]} ${nameParts[1].charAt(0)}.`;
    }
    return fullName; // Return as is if only one name or no space
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/profile/${item.user_id}`)}
    >
      <Text style={styles.position}>#{index + 1}</Text>
      <View style={styles.memberInfo}>
        <Avatar.Image
          size={40}
          source={{ uri: item.avatar_url || undefined }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{formatName(item.full_name)}</Text>
      </View>
      <Text style={styles.aura}>{item.points} Aura</Text>
      <Text style={styles.rank}>{getRankLabel(index)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Leaderboard Title */}
      <Text style={styles.header}>Leaderboard</Text>

      {/* Leaderboard List */}
      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_id}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet</Text>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    color: '#333333',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop:20,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 10,
  },
  position: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    width: 40,
    textAlign: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  avatar: {
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  aura: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C4B4',
    width: 100,
    textAlign: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: '500',
    color: '#757575',
    width: 80,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default LeaderboardContent;