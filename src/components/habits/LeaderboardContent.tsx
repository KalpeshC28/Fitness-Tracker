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
  }, [communityId]);

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard for communityId:', communityId);
      // Fetch active members
      const { data: membersData, error: membersError } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at')
        .eq('community_id', communityId)
        .eq('status', 'active');

      if (membersError) throw membersError;
      console.log('Members data:', membersData);

      // Fetch profiles for members in a separate query
      const memberIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;
      console.log('Profiles data:', profilesData);

      // Combine members with their profiles
      const membersWithProfiles = membersData.map(member => {
        const profile = profilesData.find(p => p.id === member.user_id);
        return {
          ...member,
          full_name: profile?.full_name || profile?.username || 'Unknown',
          username: profile?.username || 'Unknown',
          avatar_url: profile?.avatar_url,
        };
      });

      // Fetch points for all members in one query
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('user_id, points')
        .eq('community_id', communityId)
        .in('user_id', memberIds);

      if (pointsError) throw pointsError;
      console.log('Points data:', pointsData);

      // Combine points with members
      const leaderboardData = membersWithProfiles.map(member => {
        const pointsEntry = pointsData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          points: pointsEntry?.points || 0,
        };
      });

      // Sort by points in descending order
      leaderboardData.sort((a, b) => b.points - a.points);
      console.log('Final leaderboard data:', leaderboardData);
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => router.push(`/profile/${item.user_id}`)}
    >
      <Avatar.Image
        size={40}
        source={{ uri: item.avatar_url || undefined }}
      />
      <View style={styles.memberInfo}>
        <Text variant="bodyMedium" style={styles.memberName}>
          {item.full_name}
        </Text>
        <Text variant="bodySmall" style={styles.memberRole}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Text>
      </View>
      <Text style={styles.points}>{item.points} points</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.content}>
      <Text variant="headlineSmall">Leaderboard</Text>
      <FlatList
        data={leaderboard}
        renderItem={renderItem}
        keyExtractor={(item) => item.user_id}
        ListEmptyComponent={<Text variant="bodyLarge">No members yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRadius: 8,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontWeight: '500',
  },
  memberRole: {
    color: '#666',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00C4B4',
  },
});

export default LeaderboardContent;