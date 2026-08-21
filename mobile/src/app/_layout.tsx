import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';

import { AuthProvider } from '@/context/auth';
import { Fonts, Palette } from '@/constants/theme';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from '@expo-google-fonts/outfit';
import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_900Black,
} from '@expo-google-fonts/fraunces';

function Loading() {
  return (
    <View style={styles.loading}>
      <Text style={styles.mark}>A</Text>
      <ActivityIndicator color={Palette.primary} />
    </View>
  );
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,
  });

  if (!fontsLoaded) {
    return <Loading />;
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  mark: {
    fontFamily: Fonts.serif,
    color: Palette.white,
    fontWeight: '900',
    fontSize: 48,
  },
});
