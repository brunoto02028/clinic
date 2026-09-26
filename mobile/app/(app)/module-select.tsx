import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Text, Spinner, Logo } from "@/components/ui";
import { fetchModules, type AppModule } from "@/api/modules";
import { CLINIC_ONLY } from "@/lib/feature-flags";
import { useModule } from "@/store/module";
import { useAuth } from "@/store/auth";
import { useTheme } from "@/theme/useTheme";
import { localeToLang, t as tr } from "@/lib/i18n";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  "flask-outline": "flask-outline",
  "medkit-outline": "medkit-outline",
  "briefcase-outline": "briefcase-outline",
  "barbell-outline": "barbell-outline",
  "body-outline": "body-outline",
  "nutrition-outline": "nutrition-outline",
};

const ROUTE_MAP: Record<AppModule["key"], string> = {
  lab: "/(app)/(lab)/(tabs)",
  clinica: "/(app)/(clinica)/(tabs)",
  ba: "/(app)/(ba)/(tabs)",
  // The studio's modules — the personal-trainer product, untouched here.
  treino: "/(app)/(treino)",
  avaliacoes: "/(app)/(avaliacoes)",
  nutricao: "/(app)/(nutricao)",
};

export default function ModuleSelect() {
  const t = useTheme();
  // Runs before any patient data is fetched, so `useLang()` has nothing to
  // read; the device's locale is the honest default here, as on sign-in.
  const lang = localeToLang(
    (() => { try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch { return "en"; } })()
  );
  const setActiveModule = useModule((s) => s.setActiveModule);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const { data: rawModules, isLoading, isError, refetch } = useQuery({
    queryKey: ["modules"],
    queryFn: fetchModules,
  });

  // The app binary and the API deploy independently, so the server can answer
  // with a key this build has no route for (a module added later, or an older
  // build against a newer API). An unknown key would make the ROUTE_MAP lookup
  // undefined and router.replace throw — unprompted, inside the auto-select
  // effect. Unknown keys are dropped instead.
  const routable = rawModules?.filter((m) => m.key in ROUTE_MAP);

  // O laboratório vem do servidor como qualquer outra área: a clínica o liga
  // em /admin/labs e ele aparece aqui. O app não o acrescenta por conta —
  // fazer isso mostrava um card que a guarda do módulo depois recusava.
  const isClinicPatient = !!routable?.some((m) => m.key === "clinica");
  const modules = routable;

  // Straight past the chooser when there is nothing to choose: either the
  // account has one area, or this build is the clinic app and the account is a
  // clinic patient. Anyone else still picks — for a studio's student or a
  // lab-only account the chooser is the only way in.
  //
  // `?pick=1` desliga o desvio. Quem chega aqui pelo botão "Trocar de área"
  // **pediu** para escolher; sem isto o desvio o devolvia à clínica no mesmo
  // instante, e era por isso que o laboratório ligado em /admin/labs não
  // aparecia em parte alguma do build 15: concedido pelo servidor, inalcançável
  // pelo app. Vale só para esta visita — o próximo login volta a cair direto.
  const pediuEscolher = useLocalSearchParams<{ pick?: string }>().pick === "1";
  const skipTo =
    pediuEscolher
      ? null
      : modules && modules.length === 1
        ? modules[0].key
        : CLINIC_ONLY && isClinicPatient
          ? ("clinica" as const)
          : null;

  useEffect(() => {
    if (!skipTo) return;
    setActiveModule(skipTo);
    router.replace(ROUTE_MAP[skipTo] as any);
  }, [skipTo]);

  // An account with no areas at all — rare, but a blank chooser with zero
  // cards and no way out was the old behaviour. Say so and offer sign-out.
  const noModules = !!modules && modules.length === 0;

  const onSelect = (mod: AppModule) => {
    setActiveModule(mod.key);
    // `push`, não `replace`: com `replace` o seletor saía da pilha e o módulo
    // virava um beco — sem botão de voltar, sem trocar de área, e numa tela
    // bloqueada ("não incluído no seu plano") sem saída nenhuma. A escolha
    // automática logo acima continua com `replace`, que é o certo lá: voltar
    // para um seletor de uma opção só não leva a lugar nenhum.
    router.push(ROUTE_MAP[mod.key] as any);
  };

  // A failed lookup is not an empty entitlement list: without this the screen
  // fell through to a chooser with zero cards and no way forward. Only when
  // there is nothing cached, though — TanStack keeps `data` through a failed
  // refetch, and blocking on that would strand a user who has a perfectly
  // good answer in hand.
  if (isError && !modules) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={{ flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="cloud-offline-outline" size={40} color={t.colors.textMuted} />
          <Text
            style={{
              fontFamily: "Sora_600SemiBold",
              fontSize: 18,
              color: t.colors.text,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            {tr(lang, { en: "We could not load your areas", pt: "Não foi possível carregar suas áreas" })}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: t.colors.textMuted,
              textAlign: "center",
              marginTop: 10,
              lineHeight: 20,
            }}
          >
            {tr(lang, { en: "Check your connection and try again.", pt: "Verifique sua conexão e tente de novo." })}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => ({
              marginTop: 24,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
            })}
          >
            <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 14, color: t.colors.text }}>
              {tr(lang, { en: "Try again", pt: "Tentar de novo" })}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (noModules) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
        <View style={{ flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="phone-portrait-outline" size={40} color={t.colors.textMuted} />
          <Text
            style={{
              fontFamily: "Sora_600SemiBold",
              fontSize: 18,
              color: t.colors.text,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            {tr(lang, { en: "No areas available yet", pt: "Nenhuma área disponível ainda" })}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: t.colors.textMuted,
              textAlign: "center",
              marginTop: 10,
              lineHeight: 20,
            }}
          >
            {tr(lang, {
              en: "Your account has no areas enabled in this app yet. Please contact your clinic.",
              pt: "Sua conta ainda não tem nenhuma área liberada neste app. Fale com sua clínica.",
            })}
          </Text>

          {/* Without this the screen is a dead end: module-select is the only
              route a user with no modules can reach, so they could never sign
              out — not even to let someone else use the phone. */}
          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => ({
              marginTop: 28,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
              borderWidth: 1,
              borderColor: t.colors.border,
            })}
          >
            <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 14, color: t.colors.text }}>
              {tr(lang, { en: "Sign out", pt: "Sair" })}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || skipTo) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.background, alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 60 }}>
        {/* A marca é a primeira coisa que a pessoa vê ao abrir, e não pode
            pedir esforço: 44 era pequeno, 64 ainda era discreto. Centralizada,
            porque encostada à esquerda ela parecia um cabeçalho em vez de uma
            abertura. */}
        <Logo
          tone={t.isDark ? "bone" : "ink"}
          height={84}
          style={{ marginBottom: 32, alignSelf: "center" }}
        />
        <Text
          style={{
            fontFamily: "Sora_700Bold",
            fontSize: 26,
            color: t.colors.text,
            letterSpacing: -0.5,
            marginBottom: 6,
          }}
        >
          {user?.firstName
            ? `${tr(lang, { en: "Hi", pt: "Olá" })}, ${user.firstName}`
            : tr(lang, { en: "Welcome", pt: "Bem-vindo" })}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: t.colors.textSecondary,
            marginBottom: 36,
          }}
        >
          {tr(lang, { en: "Choose where you want to go.", pt: "Escolha para onde quer ir." })}
        </Text>

        <View style={{ gap: 14 }}>
          {(modules || []).map((mod) => (
            <Pressable
              key={mod.key}
              onPress={() => onSelect(mod)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                backgroundColor: pressed ? t.colors.surfaceMuted : t.colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: t.colors.border,
              })}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: t.colors.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name={ICON_MAP[mod.icon] || "apps-outline"}
                  size={24}
                  color={t.colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Sora_600SemiBold",
                    fontSize: 16,
                    color: t.colors.text,
                  }}
                >
                  {mod.name}
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: t.colors.textMuted,
                    marginTop: 2,
                  }}
                >
                  {mod.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* O "Sair" existia só no ramo de quem não tem módulo nenhum, com um
            comentário dizendo que sem ele a tela seria um beco sem saída. Era
            verdade também aqui: quem tem módulos que não abrem — uma conta da
            equipe da clínica entrando no app do paciente, por exemplo — ficava
            preso nesta tela, sem nem conseguir deixar outra pessoa usar o
            aparelho. Achado testando em produção, 24/09/2026. */}
        <Pressable
          onPress={() => logout()}
          testID="module-select-signout"
          accessibilityRole="button"
          style={({ pressed }) => ({
            alignSelf: "center",
            marginTop: 32,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: pressed ? t.colors.surfaceMuted : "transparent",
          })}
        >
          <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: t.colors.textMuted }}>
            {tr(lang, { en: "Sign out", pt: "Sair" })}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
