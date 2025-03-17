// src/components/habits/HabitsContent.tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert, Modal, TextInput as RNTextInput } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons'; // For checkmark, avatar, and close button

const HabitsContent: React.FC<{ communityId: string; onAddHabit: () => void }> = ({ communityId, onAddHabit }) => {
  const { supabase, user } = useAuth();
  const [habits, setHabits] = useState<any[]>([]);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [modalVisible, setModalVisible] = useState(false); // State to manage modal visibility
  const [newHabitInput, setNewHabitInput] = useState(''); // State to manage new habit input

  console.log('HabitsContent communityId:', communityId);

  useEffect(() => {
    fetchHabits();
  }, []);

  if (!user) {
    return <Text style={styles.text}>Please log in to view habits.</Text>;
  }

  const fetchHabits = async () => {
    console.log('Fetching habits for user:', user?.id);
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching habits:', error);
      return;
    }
    console.log('Fetched habits:', data);
    setHabits(data || []);
  };

  const updateHabit = async (habitId: string, newName: string) => {
    const { error } = await supabase
      .from('habits')
      .update({ name: newName })
      .eq('id', habitId)
      .eq('user_id', user?.id);
    if (error) Alert.alert('Error', 'Failed to update habit');
    else {
      setEditingHabitId(null);
      fetchHabits();
    }
  };

  const toggleDay = async (habitId: string, date: string, currentStatus: boolean) => {
    console.log('Toggling day for habitId:', habitId, 'date:', date, 'currentStatus:', currentStatus);
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      console.error('Habit not found for id:', habitId);
      return;
    }

    if (currentStatus) {
      console.log('Task already completed, unchecking not allowed');
      return;
    }

    const currentDays = Array.isArray(habit.days) ? habit.days : [];
    const dayIndex = currentDays.findIndex((d: any) => d.date === date);
    let updatedDays;
    if (dayIndex > -1) {
      updatedDays = [...currentDays];
      updatedDays[dayIndex] = { ...currentDays[dayIndex], completed: true };
    } else {
      updatedDays = [...currentDays, { date, completed: true }];
    }
    console.log('Updated days before update:', updatedDays);
    const { error, data } = await supabase
      .from('habits')
      .update({ days: updatedDays })
      .eq('id', habitId)
      .eq('user_id', user.id)
      .select();
    if (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Failed to update habit');
    } else {
      console.log('Habit updated successfully, new data:', data);
      fetchHabits();
      if (!currentStatus) {
        console.log('Adding points for user:', user.id);
        if (!user?.id) {
          Alert.alert('Error', 'Missing user ID');
          return;
        }
        try {
          const { error: pointsError } = await supabase.rpc('increment_points', {
            p_points: 30,
            p_user_id: user.id,
          });
          if (pointsError) {
            console.warn('RPC increment_points failed, falling back:', pointsError.message);
            const { data: existingPoints, error: fetchError } = await supabase
              .from('user_points')
              .select('points')
              .eq('user_id', user.id);

            console.log('Existing points fetch result:', existingPoints, fetchError);
            if (fetchError) {
              console.error('Error fetching existing points:', fetchError);
              const { error: insertError } = await supabase
                .from('user_points')
                .insert({ user_id: user.id, points: 30 });
              if (insertError) {
                console.error('Insert failed:', insertError);
                Alert.alert('Error', 'Failed to insert points');
              }
            } else if (existingPoints.length === 0) {
              const { error: insertError } = await supabase
                .from('user_points')
                .insert({ user_id: user.id, points: 30 });
              if (insertError) {
                console.error('Insert failed:', insertError);
                Alert.alert('Error', 'Failed to insert points');
              }
            } else {
              const newPoints = (existingPoints[0]?.points || 0) + 30;
              const { error: updateError } = await supabase
                .from('user_points')
                .update({ points: newPoints, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);
              if (updateError) {
                console.error('Update failed:', updateError);
                Alert.alert('Error', 'Failed to update points');
              } else {
                console.log('Points updated via fallback to:', newPoints);
              }
            }
          } else {
            console.log('Points incremented successfully via RPC');
          }
        } catch (err) {
          console.error('Unexpected error when adding points:', err);
          Alert.alert('Error', 'An unexpected error occurred while adding points');
        }
      }
    }
  };

  const getLast7Days = () => {
    const dates = [];
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayOfWeek = daysOfWeek[d.getDay()];
      dates.push({
        date: d.toISOString().split('T')[0],
        display: `${d.getDate()}`,
        dayOfWeek: dayOfWeek,
      });
    }
    return dates;
  };

  const today = new Date().toISOString().split('T')[0];

  const handleAddHabit = async () => {
    if (!newHabitInput.trim()) {
      Alert.alert('Error', 'Please enter a habit name.');
      return;
    }

    const { error } = await supabase
      .from('habits')
      .insert({
        user_id: user?.id,
        name: newHabitInput,
        days: [],
      });

    if (error) {
      console.error('Error adding habit:', error);
      Alert.alert('Error', 'Failed to add habit');
    } else {
      setModalVisible(false);
      setNewHabitInput('');
      fetchHabits();
      onAddHabit(); // Call the prop function if needed
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.header}>Your Habits:</Text>
        {habits.map((habit) => {
          return (
            <View key={`${habit.id}-${habit.days.map((d: any) => d.date).join('-')}`} style={styles.habitContainer}>
              <View style={styles.habitHeader}>
                <View style={styles.habitTitleRow}>
                  {editingHabitId === habit.id ? (
                    <TextInput
                      value={newHabitName}
                      onChangeText={setNewHabitName}
                      onBlur={() => updateHabit(habit.id, newHabitName)}
                      autoFocus
                      style={styles.editInput}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => {
                      setEditingHabitId(habit.id);
                      setNewHabitName(habit.name);
                    }}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Icon
                  name="account-circle"
                  size={24}
                  color="#757575"
                  style={styles.avatarIcon}
                />
              </View>
              <View style={styles.frequencyContainer}>
                <Text style={styles.frequencyText}>everyday</Text>
              </View>
              <View style={styles.daysContainer}>
                {getLast7Days().map(({ date, display, dayOfWeek }) => {
                  const dayData = habit.days.find((d: any) => d.date === date);
                  const isToday = date === today;
                  const isFuture = new Date(date) > new Date(today);
                  const isCompleted = dayData?.completed || false;
                  console.log('Rendering day for date:', date, 'dayData:', dayData);
                  return (
                    <View key={date} style={styles.dayWrapper}>
                      <Text style={styles.dayOfWeekText}>{dayOfWeek}</Text>
                      <TouchableOpacity
                        style={[
                          styles.dayButton,
                          isCompleted && styles.dayButtonCompleted,
                          isToday && styles.dayButtonToday,
                          (isFuture || !isToday) && styles.dayButtonDisabled,
                        ]}
                        onPress={() => !isFuture && isToday && toggleDay(habit.id, date, isCompleted)}
                        disabled={isFuture || !isToday || isCompleted}
                      >
                        {isCompleted ? (
                          <Icon name="check" size={16} color="#FFFFFF" />
                        ) : (
                          <Text style={styles.dayText}>{display}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {habits.length < 7 && (
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color="#757575" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Habit</Text>
            <TextInput
              placeholder="habit Name"
              value={newHabitInput}
              onChangeText={setNewHabitInput}
              style={styles.modalInput}
              autoFocus
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleAddHabit}
            >
              <Text style={styles.submitButtonText}>Add Habit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 10,
    color: '#000',
  },
  header: {
    color: '#333333',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  habitContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitName: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '500',
  },
  editInput: {
    color: '#333333',
    fontSize: 18,
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
  },
  avatarIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyContainer: {
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  frequencyText: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  dayWrapper: {
    alignItems: 'center',
  },
  dayOfWeekText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 5,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#B0B0B0',
  },
  dayButtonCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dayButtonToday: {
    borderColor: '#007AFF',
  },
  dayButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.5,
  },
  dayText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333333',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#26C6DA', // Teal color from the screenshot
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HabitsContent;