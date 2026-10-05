import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/AuthProvider';

export default function Index() {
  const { session } = useAuth();
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
