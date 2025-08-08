import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';

export default function FitnessHomeScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Daily Summary Cards */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Today's Progress</Title>
          <Paragraph>Steps: 8,542 / 10,000</Paragraph>
          <Paragraph>Calories: 1,847 / 2,200</Paragraph>
          <Paragraph>Workouts: 1 completed</Paragraph>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Quick Actions</Title>
          <Button mode="contained" onPress={() => {}}>Log Workout</Button>
          <Button mode="outlined" onPress={() => {}}>Add Meal</Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
