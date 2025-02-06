import { ThemeProvider } from 'react-native-paper';
import { theme } from './src/constants/theme';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigation from './src/navigation';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
    </ThemeProvider>
  );
} 