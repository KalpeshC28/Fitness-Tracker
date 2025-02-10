import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { cardStyle } from '../../constants/theme';

// Local colors
const colors = {
  background: '#FFFFFF',
  text: '#000000',
  primary: '#007AFF',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      console.error(error);
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
        
        <View style={styles.card}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>
        </View>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/register')}
          style={styles.linkButton}
        >
          Don't have an account? Sign up
        </Button>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/forgot-password')}
        >
          Forgot Password?
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
    color: colors.text,
  },
  card: {
    ...cardStyle,
    padding: 16,
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  linkButton: {
    marginVertical: 4,
  },
}); 