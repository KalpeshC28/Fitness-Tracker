// Get this URL from your Expo development server
const DEV_URL = process.env.EXPO_PUBLIC_DEV_URL || 'exp://192.168.x.x:8081'; // Replace with your actual Expo URL
const PROD_URL = 'tribex://';

// Add the callback path
const DEV_REDIRECT = `${DEV_URL}/auth/callback`;
const PROD_REDIRECT = `${PROD_URL}/auth/callback`;

export const AUTH_REDIRECT_URL = __DEV__ ? DEV_REDIRECT : PROD_REDIRECT; 