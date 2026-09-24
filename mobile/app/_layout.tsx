import { useEffect, useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/store/auth";
import { wireAppFocus, wireNetwork } from "@/lib/app-focus";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();


export default function RootLayout() {
  const bootstrap = useAuth((s) => s.bootstrap);

  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Traduz "o app voltou ao primeiro plano" em "revalide o que está na tela".
  // Sem isto, o que a clínica muda só aparece quando o paciente fecha e abre
  // o app, porque as abas nunca desmontam (075, T-12).
  useEffect(() => wireAppFocus(), []);
  useEffect(() => wireNetwork(), []);

  const onReady = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }} onLayout={onReady}>
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
