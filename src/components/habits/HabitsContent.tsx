// src/components/habits/HabitsContent.tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { Text, Checkbox, TextInput } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

const HabitsContent: React.FC<{ communityId: string; onAddHabit: () => void }> = ({ communityId, onAddHabit }) => {
  const { supabase, user } = useAuth();
  const [habits, setHabits] = useState<any[]>([]);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState('');

  console.log('HabitsContent communityId:', communityId);

  useEffect(() => {
    fetchHabits();
  }, []);

  if (!user) {
    return <Text>Please log in to view habits.</Text>;
  }

  const fetchHabits = async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching habits:', error);
    else setHabits(data || []);
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
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const updatedDays = habit.days.map((d: any) =>
      d.date === date ? { ...d, completed: !currentStatus } : d
    );
    const { error } = await supabase
      .from('habits')
      .update({ days: updatedDays })
      .eq('id', habitId)
      .eq('user_id', user.id);
    if (error) {
      Alert.alert('Error', 'Failed to update habit');
    } else {
      fetchHabits();
      if (!currentStatus) {
        console.log('toggleDay - Adding points for user:', user.id, 'communityId:', communityId);
        if (!communityId || !user?.id) {
          Alert.alert('Error', 'Missing community or user ID');
          return;
        }
        try {
          // Call the increment_points RPC
          const { error: pointsError } = await supabase.rpc('increment_points', {
            p_community_id: communityId,
            p_points: 30,
            p_user_id: user.id,
          });
          if (pointsError) {
            console.error('RPC increment_points failed:', pointsError);
            Alert.alert('Error', 'Failed to add points via RPC');
            // Fallback: Direct table update
            const { data: existingPoints, error: fetchError } = await supabase
              .from('user_points')
              .select('points')
              .eq('user_id', user.id)
              .eq('community_id', communityId);

            console.log('Existing points fetch result:', existingPoints, fetchError);
            if (fetchError) {
              console.error('Error fetching existing points:', fetchError);
              // Insert new record if none exists
              const { error: insertError } = await supabase
                .from('user_points')
                .insert({ user_id: user.id, community_id: communityId, points: 30 });
              if (insertError) {
                console.error('Insert failed:', insertError);
                Alert.alert('Error', 'Failed to insert points');
              }
            } else if (existingPoints.length === 0) {
              // No record exists, insert new
              const { error: insertError } = await supabase
                .from('user_points')
                .insert({ user_id: user.id, community_id: communityId, points: 30 });
              if (insertError) {
                console.error('Insert failed:', insertError);
                Alert.alert('Error', 'Failed to insert points');
              }
            } else {
              // Update existing record
              const newPoints = (existingPoints[0]?.points || 0) + 30;
              const { error: updateError } = await supabase
                .from('user_points')
                .update({ points: newPoints, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('community_id', communityId);
              if (updateError) {
                console.error('Update failed:', updateError);
                Alert.alert('Error', 'Failed to update points');
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
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        date: d.toISOString().split('T')[0],
        display: `${d.getDate()}/${d.getMonth() + 1}`, // Day/Month format
      });
    }
    return dates;
  };

  const today = new Date().toISOString().split('T')[0]; // e.g., "2025-03-15"

  const calculateCompletion = (days: any[]) => {
    const totalDays = days.length;
    const completedDays = days.filter(d => d.completed).length;
    const percentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;
    return { completedDays, totalDays, percentage: percentage.toFixed(0) };
  };

  return (
    <ScrollView style={styles.content}>
      <Text variant="headlineSmall" style={styles.header}>Your Habits:</Text>
      {habits.map((habit) => {
        const { completedDays, totalDays, percentage } = calculateCompletion(habit.days);
        return (
          <View key={habit.id} style={styles.habitContainer}>
            <View style={styles.habitHeader}>
              <View style={styles.habitTitleRow}>
                <Text style={styles.completionText}>
                  {completedDays}/{totalDays} {percentage}%
                </Text>
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
              <View style={styles.iconPlaceholder} />
            </View>
            <View style={styles.daysContainer}>
              {getLast7Days().map(({ date, display }) => {
                const dayData = habit.days.find((d: any) => d.date === date);
                const isToday = date === today;
                const isFuture = new Date(date) > new Date(today);
                return (
                  <View key={date} style={styles.dayItem}>
                    <Text style={[styles.dayText, isToday && styles.todayText]}>
                      {display}
                    </Text>
                    <Checkbox
                      status={dayData?.completed ? 'checked' : 'unchecked'}
                      onPress={() => toggleDay(habit.id, date, dayData?.completed || false)}
                      disabled={isFuture || !isToday} // Disable all dates except today
                      color={isToday ? '#007AFF' : undefined}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      {habits.length < 7 && (
        <TouchableOpacity style={styles.addButton} onPress={onAddHabit}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    color: '#333',
    marginBottom: 15,
  },
  habitContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionText: {
    color: '#00C4B4',
    fontSize: 14,
    marginRight: 10,
  },
  habitName: {
    color: '#333',
    fontSize: 18,
    fontWeight: '500',
  },
  editInput: {
    color: '#333',
    fontSize: 18,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  iconPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
  },
  dayText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 5,
  },
  todayText: {
    color: '#007AFF',
    fontWeight: 'bold',
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
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default HabitsContent;