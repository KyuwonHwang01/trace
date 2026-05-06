import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useLora,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';
import { I18nProvider } from './src/i18n';
import { runMigrations } from './src/storage/migration';
import { isOnboarded } from './src/storage/onboarding';
import type { RootStackParamList } from './src/navigation/types';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [loraLoaded] = useLora({
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_600SemiBold,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [migrated, setMigrated] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      await runMigrations();
      const onboarded = await isOnboarded();
      setInitialRoute(onboarded ? 'Home' : 'Onboarding');
      setMigrated(true);
    })();
  }, []);

  const ready = loraLoaded && interLoaded && migrated && initialRoute !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const onReady = useCallback(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onReady}>
          <RootNavigator initialRoute={initialRoute!} />
        </View>
      </SafeAreaProvider>
    </I18nProvider>
  );
}
