import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const HabitsContent: React.FC = () => {
  return (
    <ScrollView style={styles.content}>
      <Text variant="headlineSmall">Your Habits:</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 20,
  },
});

export default HabitsContent;