//src/screens/CommunititesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import HabitsContent from '../../components/habits/HabitsContent';
import LeaderboardContent from '../../components/habits/LeaderboardContent';
import { useAuth } from '../../context/AuthContext';
import { useActiveCommunity } from '../../context/ActiveCommunityContext'; // Add this import
import Modal from 'react-native-modal';

const CommunitiesScreen: React.FC = () => {
  const { activeCommunityId } = useActiveCommunity(); // Use activeCommunityId from context
  console.log('CommunitiesScreen activeCommunityId:', activeCommunityId); // Update this log

  const { supabase, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Habits' | 'Leaderboard'>('Habits');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  if (!activeCommunityId) {
    return <Text>No active community selected...</Text>;
  }

  if (!user) {
    return <Text>Please log in to view this page.</Text>;
  }

  const addHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Error', 'Habit name cannot be empty');
      return;
    }
    const last7Days = getLast7Days().map(date => ({ date, completed: false }));
    const { error } = await supabase
      .from('habits')
      .insert({ user_id: user.id, name: newHabitName, days: last7Days });
    if (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    } else {
      setShowAddHabit(false);
      setNewHabitName('');
    }
  };

  const getLast7Days = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

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

      {activeTab === 'Habits' ? (
        <HabitsContent
          communityId={activeCommunityId} 
          onAddHabit={() => setShowAddHabit(true)}
        />
      ) : (
        <LeaderboardContent communityId={activeCommunityId} 
 />
      )}

      <Modal
        isVisible={showAddHabit}
        onBackdropPress={() => setShowAddHabit(false)}
        style={styles.modal}
        backdropOpacity={0.5}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContentContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Habit</Text>
            <TextInput
              label="Habit Name"
              value={newHabitName}
              onChangeText={setNewHabitName}
              style={styles.input}
              autoFocus
            />
            <TouchableOpacity style={styles.button} onPress={addHabit}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setShowAddHabit(false)}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 300,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CommunitiesScreen;