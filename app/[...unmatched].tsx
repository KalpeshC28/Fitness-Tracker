// app/[...unmatched].tsx
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function UnmatchedRoute() {
  const params = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Unmatched Route: {JSON.stringify(params)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Light background color
  },
  text: {
    fontSize: 18,
    color: '#333', // Dark text color
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
