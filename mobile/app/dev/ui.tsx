import { useState } from "react";
import { View } from "react-native";
import {
  Screen, Text, Button, Input, Card, Spinner,
  Pill, Avatar, TriBar, Chip, ListItem, SegmentedControl,
} from "@/components/ui";
import { useTheme } from "@/theme/useTheme";

export default function UiShowcase() {
  const t = useTheme();
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState("");
  const [seg, setSeg] = useState(0);

  return (
    <Screen scroll testID="ui-showcase">
      <View style={{ gap: 16 }}>
        <Text variant="title">Design System</Text>

        <Text variant="subtitle">Typography</Text>
        <Card>
          <Text variant="hero">Hero</Text>
          <Text variant="title">Title</Text>
          <Text variant="heading">Heading</Text>
          <Text variant="subtitle">Subtitle</Text>
          <Text variant="body">Body text</Text>
          <Text variant="label">Label</Text>
          <Text variant="caption" muted>Caption muted</Text>
          <Text variant="eyebrow">EYEBROW</Text>
        </Card>

        <Text variant="subtitle">Buttons</Text>
        <Card>
          <Button title="Primary" variant="primary" />
          <Button title="Greige" variant="greige" />
          <Button title="Ghost" variant="ghost" />
          <Button title="Danger" variant="danger" />
          <Button title="Work" variant="work" />
          <Button title="Health" variant="health" />
          <Button title="Community" variant="community" />
          <Button
            title="Loading toggle"
            loading={loading}
            onPress={() => setLoading((v) => !v)}
          />
          <Button title="Disabled" disabled />
        </Card>

        <Text variant="subtitle">Pills</Text>
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pill label="Ok" variant="ok" />
            <Pill label="Warn" variant="warn" />
            <Pill label="Bad" variant="bad" />
            <Pill label="Work" variant="work" />
            <Pill label="Health" variant="health" />
            <Pill label="Community" variant="community" />
            <Pill label="Muted" variant="muted" />
          </View>
        </Card>

        <Text variant="subtitle">Avatars</Text>
        <Card>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Avatar label="KP" round size={44} />
            <Avatar label="AB" pillar="work" size={44} />
            <Avatar label="CD" pillar="health" size={44} />
            <Avatar label="EF" pillar="community" size={44} />
          </View>
        </Card>

        <Text variant="subtitle">TriBar</Text>
        <Card>
          <TriBar work health />
          <TriBar work health community />
        </Card>

        <Text variant="subtitle">Chips</Text>
        <Card>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="All" selected accentColor={t.colors.primary} onPress={() => {}} />
            <Chip label="Work" accentColor={t.colors.work} onPress={() => {}} />
            <Chip label="Health" accentColor={t.colors.health} onPress={() => {}} />
          </View>
        </Card>

        <Text variant="subtitle">SegmentedControl</Text>
        <Card>
          <SegmentedControl options={["Tab A", "Tab B", "Tab C"]} selected={seg} onSelect={setSeg} />
        </Card>

        <Text variant="subtitle">Cards</Text>
        <Card accent="work"><Text variant="label">Work accent</Text></Card>
        <Card accent="health"><Text variant="label">Health accent</Text></Card>
        <Card accent="community"><Text variant="label">Community accent</Text></Card>
        <Card dark><Text variant="label" color="#FFFFFF">Dark card</Text></Card>

        <Text variant="subtitle">ListItem</Text>
        <Card>
          <ListItem icon={<Avatar label="A" pillar="work" size={32} />} title="First item" subtitle="Subtitle" />
          <ListItem icon={<Avatar label="B" pillar="health" size={32} />} title="Second item" subtitle="Subtitle" last />
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
