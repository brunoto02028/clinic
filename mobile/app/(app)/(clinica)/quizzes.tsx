import { FlatList } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Screen, Text, Card, Spinner } from "@/components/ui";
import { fetchQuizzes, quizTitle } from "@/api/extras";
import { useTheme } from "@/theme/useTheme";
import { useLang, t as tr } from "@/lib/i18n";
import { PlanGate } from "@/components/PlanGate";

function QuizzesScreen() {
  const t = useTheme();
  const lang = useLang();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["quizzes"],
    queryFn: fetchQuizzes,
  });

  return (
    <Screen testID="quizzes-screen">
      <Stack.Screen options={{ headerShown: true, title: tr(lang, { en: "Quizzes", pt: "Quizzes" }), headerStyle: { backgroundColor: t.colors.background }, headerTintColor: t.colors.text, headerShadowVisible: false }} />
      {isLoading ? (
        <Spinner center />
      ) : isError ? (
        <Text color={t.colors.bad}>{tr(lang, { en: "We could not load the quizzes.", pt: "Não foi possível carregar os quizzes." })}</Text>
      ) : (data ?? []).length === 0 ? (
        <Text muted testID="quizzes-empty">{tr(lang, { en: "No quizzes available.", pt: "Nenhum quiz disponível." })}</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(q) => q.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <Text variant="subtitle">{quizTitle(item)}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

/**
 * Gated on `mod_quizzes` — the registry points that key straight at
 * /dashboard/quizzes, so the web hides the page outright when it is not
 * granted and the app was the only surface still listing them.
 */
export default function Quizzes() {
  return (
    <PlanGate module="mod_quizzes">
      <QuizzesScreen />
    </PlanGate>
  );
}
