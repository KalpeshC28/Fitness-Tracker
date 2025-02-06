import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Instead of using .env directly, we'll hardcode for now to avoid config issues
const supabaseUrl = 'https://rrbjbbxqmrppnmejdubg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyYmpiYnhxbXJwcG5tZWpkdWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg3ODU5MTcsImV4cCI6MjA1NDM2MTkxN30.Hi63T6Cy8CFJbegusAz7Fss6yAaQ3RcU06z48p8sO7E';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
}); 