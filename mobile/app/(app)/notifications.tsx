import { useState } from "react";
import { Switch, View } from "react-native";
import { Stack } from "expo-router";
import { Screen, Text, Card } from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

/**
 * STUB: push notifications require native setup (Firebase/APNs + expo-notifications)
 * and a physical device — not exercised in the Expo Web target. This screen is a
 * placeholder for the opt-in toggle; no token is registered yet.
 */
export default function Notifications() {
  const t = useTheme();
  const [enabled, setEnabled] = useState(false);

  return (
    <Screen testID="notifications-screen">
      <Stack.Screen options={{ headerShown: true, title: "Notificações" }} />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="subtitle">Notificações push</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ true: t.colors.primary }}
            testID="notif-toggle"
          />
        </View>
        <Text variant="caption" muted>
          Em breve: lembretes de agendamento e mensagens da clínica. A ativação real
          depende do build nativo (configuração pendente).
        </Text>
      </Card>
    </Screen>
  );
}
