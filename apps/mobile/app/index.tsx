import { Redirect } from 'expo-router';

// Etapa 3 inserirá aqui a decisão login x app, conforme a sessão.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
