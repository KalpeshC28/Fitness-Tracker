import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const LeaderboardContent: React.FC = () => {
  return (
    <View style={styles.content}>
      <Text variant="headlineSmall">Leaderboard</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
  },
});

export default LeaderboardContent;