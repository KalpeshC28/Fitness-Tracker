import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface TimerProps {
  endTime: string;
}

const TimerComponent: React.FC<TimerProps> = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const initialTimeLeft = Math.max(0, new Date(endTime).getTime() - Date.now());
    setTimeLeft(initialTimeLeft);

    const timerInterval = setInterval(() => {
      const newTimeLeft = Math.max(0, new Date(endTime).getTime() - Date.now());
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);

    // Fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    return () => clearInterval(timerInterval);
  }, [endTime, fadeAnim]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  if (timeLeft <= 0) {
    return (
      <View style={styles.expiredContainer}>
        <Text style={styles.expiredText}>Offer Expired</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.timerDisplay}>
        <View style={styles.timeBlock}>
          <Text style={styles.timerDigit}>{String(hours).padStart(2, '0')}</Text>
          <Text style={styles.timerLabel}>Hours</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timerDigit}>{String(minutes).padStart(2, '0')}</Text>
          <Text style={styles.timerLabel}>Minutes</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timerDigit}>{String(seconds).padStart(2, '0')}</Text>
          <Text style={styles.timerLabel}>Seconds</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E6F0FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    width: 80,
    height: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timerDigit: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginTop: 4,
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginHorizontal: 4,
  },
  expiredContainer: {
    backgroundColor: '#FFE6E6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 8,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

export default TimerComponent;