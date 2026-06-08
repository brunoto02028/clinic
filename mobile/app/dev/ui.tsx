import { useState } from "react";
import { View } from "react-native";
import { Screen, Text, Button, Input, Card, Spinner } from "@/components/ui";

/** Temporary dev showcase to inspect base UI components on Expo Web. */
export default function UiShowcase() {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Screen scroll testID="ui-showcase">
      <View style={{ gap: 16 }}>
        <Text variant="title">Design System</Text>

        <Text variant="subtitle">Typography</Text>
        <Card>
          <Text variant="title">Title</Text>
          <Text variant="subtitle">Subtitle</Text>
          <Text variant="body">Body text</Text>
          <Text variant="label">Label</Text>
          <Text variant="caption" muted>
            Caption muted
          </Text>
        </Card>

        <Text variant="subtitle">Buttons</Text>
        <Card>
          <Button title="Primary" variant="primary" />
          <Button title="Secondary" variant="secondary" />
          <Button title="Ghost" variant="ghost" />
          <Button title="Danger" variant="danger" />
          <Button
            title="Loading toggle"
            loading={loading}
            onPress={() => setLoading((v) => !v)}
          />
          <Button title="Disabled" disabled />
        </Card>

        <Text variant="subtitle">Input</Text>
        <Card>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
          />
          <Input label="With error" placeholder="invalid" error="Required field" />
        </Card>

        <Text variant="subtitle">Spinner</Text>
        <Card>
          <Spinner size="small" />
        </Card>
      </View>
    </Screen>
  );
}
