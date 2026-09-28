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
import { PushRouter } from "@/components/PushRouter";
import { useThemeStore } from "@/store/theme";
import { applyUpdateOnLaunch } from "@/lib/app-updates";
import { consumirOndeEstava } from "@/lib/return-to";
import { router } from "expo-router";
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

/**
 * A cor que atravessa a abertura inteira: splash, o vão do carregamento, a
 * raiz e a primeira tela. Qualquer diferença entre elas vira piscada.
 */
/**
 * A cor do splash, que vive no `app.json` e **não muda sem build**.
 *
 * Só é usada no vão entre o splash e as fontes carregarem: ali a tela tem
 * de ser da cor do splash, senão a transição pisca. Depois disso, quem manda
 * é o tema escolhido pela pessoa (086).
 */
const FUNDO_DO_SPLASH = "#F5F4F1";

// Sem o `.catch`, uma rejeição aqui (o splash já ter se escondido sozinho)
// vira promessa não tratada — e a tela pisca sem ninguém saber por quê.
SplashScreen.preventAutoHideAsync().catch(() => {});


export default function RootLayout() {
  const esquema = useThemeStore((s) => s.modo);
  const fundoDoTema = esquema === "dark" ? "#191C23" : FUNDO_DO_SPLASH;
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

  // Quem saiu para os Ajustes volta na tela de onde saiu. O iOS reinicia o app
  // ao mudar uma permissão, e sem isto a pessoa reabre no início — longe do
  // que estava fazendo. Vale por cinco minutos e serve uma vez só, então uma
  // abertura normal nunca cai no meio de nada.
  useEffect(() => {
    void consumirOndeEstava().then((rota) => {
      if (rota) router.replace(rota as never);
    });
  }, []);

  // Traduz "o app voltou ao primeiro plano" em "revalide o que está na tela".
  // Sem isto, o que a clínica muda só aparece quando o paciente fecha e abre
  // o app, porque as abas nunca desmontam (075, T-12).
  /**
   * A preferência de tom, lida antes de a primeira tela pintar (086).
   *
   * Sem isto o app abriria claro e trocaria para escuro um instante depois —
   * um piscar branco na cara de quem escolheu escuro justamente para não levar
   * luz no rosto.
   */
  useEffect(() => {
    void useThemeStore.getState().carregar();
  }, []);

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
    // `return null` deixava a janela **sem nada** enquanto as fontes carregam,
    // e o que aparece nesse vão é o fundo do sistema — branco ou preto,
    // conforme o tema do aparelho. Era uma das piscadas da abertura. Uma tela
    // da cor do splash não se distingue do splash: a transição some.
    return <View style={{ flex: 1, backgroundColor: FUNDO_DO_SPLASH }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* A barra de status acompanha o tom: conteúdo escuro sobre fundo
            claro, claro sobre escuro. Em tempo de execução, sem `app.json`
            — e portanto sem build. */}
        <StatusBar style={esquema === "dark" ? "light" : "dark"} />
        {/* A cor é explícita e igual à do splash. Sem ela, entre o splash
            sumir e a primeira tela pintar, aparecia o fundo da janela — a
            segunda piscada. */}
        {/* Daqui para baixo quem manda é o tom escolhido. Cravar bege aqui
            deixava uma faixa clara de tela inteira atrás de todo o app no
            modo escuro — o meio-caminho que um tema pela metade produz. */}
        <View style={{ flex: 1, backgroundColor: fundoDoTema }} onLayout={onReady}>
          <Stack screenOptions={{ headerShown: false }} />
          {/* A tranca cobre o app em vez de navegar até ele. Como rota, ela
              trocava o <Stack> por um <Redirect> e destruía o histórico de
              navegação do paciente a cada duas horas... a cada dois minutos em
              segundo plano, na verdade. */}
          <LockOverlay />
          {/* Na raiz porque o toque pode chegar com o app fechado, antes de
              qualquer tela existir. */}
          <PushRouter />
          {/* Por cima até da tranca: o print do multitarefa é tirado antes de
              qualquer coisa acontecer. */}
          <PrivacyCover />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
