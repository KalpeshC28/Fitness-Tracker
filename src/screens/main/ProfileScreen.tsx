import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium">Profile</Text>
        <Text variant="bodyLarge" style={styles.email}>{user?.email}</Text>
        <Button mode="contained" onPress={signOut} style={styles.button}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  email: {
    marginVertical: 20,
  },
  button: {
    marginTop: 10,
  },
}); 