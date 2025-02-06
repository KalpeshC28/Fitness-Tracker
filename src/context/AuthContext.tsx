import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { AUTH_REDIRECT_URL } from '../constants/config';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: {
    full_name?: string;
    username?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  supabase: typeof supabase;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    supabase,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email: string, password: string, userData: { full_name?: string; username?: string }) => {
      try {
        // 1. Sign up the user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: userData.full_name,
              username: userData.username || email.split('@')[0],
            },
            emailRedirectTo: AUTH_REDIRECT_URL
          }
        });
        
        if (authError) {
          console.error('Auth Error:', authError);
          throw new Error(authError.message);
        }
        
        if (!authData.user) {
          throw new Error('No user data returned');
        }

        // Profile will be created automatically by the database trigger
        alert(
          'Registration successful! Please check your email to verify your account.\n\n' +
          'Important: If using Expo Go, please open the verification link on your computer browser and copy the token. ' +
          'Then paste it in the app when prompted.'
        );
        router.push('/(auth)/login');
      } catch (error: any) {
        console.error('Error during sign up:', error);
        alert(error.message || 'An error occurred during registration');
        throw error;
      }
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 