import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, TextInput, Button, Text } from 'react-native-paper';

export default function BMICalculatorScreen() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBMI] = useState<number | null>(null);

  const calculateBMI = () => {
    const h = parseFloat(height) / 100; // Convert cm to m
    const w = parseFloat(weight);
    const bmiValue = w / (h * h);
    setBMI(bmiValue);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Height (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Weight (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            style={styles.input}
          />
          <Button mode="contained" onPress={calculateBMI}>
            Calculate BMI
          </Button>
          {bmi && (
            <View style={styles.result}>
              <Text>BMI: {bmi.toFixed(1)}</Text>
              <Text>Category: {getBMICategory(bmi)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}
