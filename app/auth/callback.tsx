import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter, useSearchParams } from 'expo-router';

export default function AuthCallback() {
  const { supabase } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.token_hash as string,
        type: 'email',
      });

      if (error) {
        alert('Error verifying email: ' + error.message);
      } else {
        alert('Email verified successfully!');
      }
      
      router.replace('/(auth)/login');
    };

    if (params.token_hash) {
      handleEmailConfirmation();
    }
  }, [params.token_hash]);

  return <Text>Verifying email...</Text>;
} 