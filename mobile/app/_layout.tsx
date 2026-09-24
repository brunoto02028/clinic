import { useEffect, useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { useAuth } from "@/store/auth";
import { wireAppFocus, wireNetwork } from "@/lib/app-focus";
import { wireAppLock } from "@/lib/app-lock";
import { PrivacyCover } from "@/components/PrivacyCover";
import { LockOverlay } from "@/components/LockOverlay";
import { applyUpdateOnLaunch } from "@/lib/app-updates";
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

  // Busca e aplica o update na MESMA abertura. O padrão do expo-updates é
  // aplicar só na seguinte, o que faz quem testa abrir, ver tudo igual e
  // concluir que a correção não foi feita — custou horas em 24/09/2026.
  useEffect(() => {
    void applyUpdateOnLaunch();
  }, []);

  // Traduz "o app voltou ao primeiro plano" em "revalide o que está na tela".
  // Sem isto, o que a clínica muda só aparece quando o paciente fecha e abre
  // o app, porque as abas nunca desmontam (075, T-12).
  useEffect(() => wireAppFocus(), []);
  useEffect(() => wireNetwork(), []);

  // Tranca de novo quando o app passa tempo demais em segundo plano. Sem isto
  // a biometria só valeria na abertura a frio, e o app fica semanas vivo na
  // bandeja do telefone.
  useEffect(() => wireAppLock(), []);

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
          {/* A tranca cobre o app em vez de navegar até ele. Como rota, ela
              trocava o <Stack> por um <Redirect> e destruía o histórico de
              navegação do paciente a cada duas horas... a cada dois minutos em
              segundo plano, na verdade. */}
          <LockOverlay />
          {/* Por cima até da tranca: o print do multitarefa é tirado antes de
              qualquer coisa acontecer. */}
          <PrivacyCover />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
