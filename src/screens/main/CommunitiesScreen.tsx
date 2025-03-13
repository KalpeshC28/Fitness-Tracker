import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import HabitsContent from '../../components/habits/HabitsContent';
import LeaderboardContent from '../../components/habits/LeaderboardContent';

const CommunitiesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Habits' | 'Leaderboard'>('Habits');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            styles.leftTab,
            activeTab === 'Habits' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('Habits')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Habits' && styles.activeTabText,
            ]}
          >
            Habits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            styles.rightTab,
            activeTab === 'Leaderboard' && styles.activeTab, 
          ]}
          onPress={() => setActiveTab('Leaderboard')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Leaderboard' && styles.activeTabText,
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'Habits' ? <HabitsContent /> : <LeaderboardContent />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  leftTab: {
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderRightWidth: 0,
  },
  rightTab: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderLeftWidth: 0,
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderColor: '#2196F3',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CommunitiesScreen;