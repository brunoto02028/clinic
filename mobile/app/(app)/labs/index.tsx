import { useState } from "react";
import { View, FlatList, Pressable, ScrollView } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Card, Input, Spinner, Chip } from "@/components/ui";
import { fetchLabCatalog, LabProduct } from "@/api/labs";
import { useTheme } from "@/theme/useTheme";

const CATEGORIES = ["All", "Hormones", "Vitamins", "Thyroid", "Liver", "Kidney", "Heart", "Diabetes"];

export default function LabsHub() {
  const t = useTheme();
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-catalog"],
    queryFn: fetchLabCatalog,
  });

  const filtered = (data ?? []).filter((p: LabProduct) => {
    const matchesSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Screen testID="labs-hub">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Blood Tests",
          headerStyle: { backgroundColor: t.colors.background },
          headerTintColor: t.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={{ gap: 16, flex: 1 }}>
        <View>
          <Text variant="title">Blood Tests</Text>
          <Text variant="caption" color={t.colors.textSecondary} style={{ marginTop: 2 }}>
            Browse available tests
          </Text>
        </View>

        <Input
          placeholder="Search tests..."
          value={searchText}
          onChangeText={setSearchText}
          icon={<Ionicons name="search-outline" size={18} color={t.colors.textMuted} />}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              accentColor={t.colors.work}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <Spinner center />
        ) : isError ? (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="alert-circle" size={20} color={t.colors.bad} />
              <Text color={t.colors.bad}>Failed to load tests.</Text>
            </View>
          </Card>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", gap: 12, paddingVertical: 40 }}>
            <Ionicons name="flask-outline" size={48} color={t.colors.textMuted} />
            <Text variant="subtitle" color={t.colors.textSecondary}>No tests found</Text>
            <Text variant="caption" color={t.colors.textMuted} style={{ textAlign: "center" }}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/(app)/labs/${item.id}`)}>
                <Card>
                  <View style={{ gap: 8 }}>
                    <Text variant="label" style={{ fontWeight: "600" }}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: t.colors.workSoft,
                          paddingHorizontal: 10,
                          paddingVertical: 3,
                          borderRadius: 10,
                        }}
                      >
                        <Text variant="caption" color={t.colors.work} style={{ fontSize: 11 }}>
                          {item.category}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="time-outline" size={13} color={t.colors.textMuted} />
                        <Text variant="caption" color={t.colors.textMuted}>
                          Results in {item.turnaroundDays} days
                        </Text>
                      </View>
                    </View>
                    <Text variant="subtitle" color={t.colors.work} style={{ fontWeight: "700" }}>
                      £{item.price.toFixed(2)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
