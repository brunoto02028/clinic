import { useState } from "react";
import { View, FlatList, Pressable, ScrollView, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Screen, Text, Spinner } from "@/components/ui";
import { fetchLabCatalog, LabProduct } from "@/api/labs";

const INK = "#20242D";
const INK_80 = "#3A3E48";
const INK_60 = "#6B6F78";
const INK_40 = "#A5A8AE";
const INK_20 = "#DDE0E4";
const BONE = "#F5F4F1";
const SAGE_DARK = "#4F6864";
const SAGE_FOG = "#E4EDE7";
const HAIR = "rgba(32,36,45,0.08)";
const CARD_BORDER = "rgba(32,36,45,0.05)";

const CATEGORIES = [
  "All",
  "Hormones",
  "Vitamins",
  "Thyroid",
  "Liver",
  "Kidney",
  "Heart",
  "General",
];

export default function LabCatalog() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lab-catalog"],
    queryFn: fetchLabCatalog,
  });

  const filtered = (data ?? []).filter((p: LabProduct) => {
    const matchSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      category === "All" ||
      p.category?.toLowerCase() === category.toLowerCase();
    return matchSearch && matchCat;
  });

  // Group by category for display
  const grouped = filtered.reduce<Record<string, LabProduct[]>>((acc, p) => {
    const cat = p.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <Screen testID="labs-catalog" style={{ backgroundColor: BONE }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Blood Tests",
          headerStyle: { backgroundColor: BONE },
          headerTintColor: INK,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: "Sora_600SemiBold",
            fontSize: 14,
          },
        }}
      />

      <View style={{ flex: 1, gap: 10 }}>
        {/* Search bar */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: HAIR,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="search" size={14} color={INK_40} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tests..."
            placeholderTextColor={INK_60}
            style={{
              flex: 1,
              fontSize: 11.5,
              fontFamily: "Inter_400Regular",
              color: INK,
              padding: 0,
            }}
          />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active ? INK : "#FFFFFF",
                  borderWidth: active ? 0 : 1,
                  borderColor: HAIR,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Sora_700Bold",
                    fontSize: 10,
                    color: active ? BONE : INK_60,
                  }}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Spinner />
          </View>
        ) : isError ? (
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: CARD_BORDER,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons name="alert-circle" size={18} color="#A24738" />
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: "#A24738",
              }}
            >
              Could not load tests. Pull down to retry.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 48 }}>
            <Ionicons name="flask-outline" size={40} color={INK_40} />
            <Text
              style={{
                fontFamily: "Sora_600SemiBold",
                fontSize: 14,
                color: INK_60,
              }}
            >
              No tests found
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Inter_400Regular",
                color: INK_40,
                textAlign: "center",
              }}
            >
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={Object.entries(grouped)}
            keyExtractor={([cat]) => cat}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item: [cat, products] }) => (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: CARD_BORDER,
                  marginBottom: 10,
                }}
              >
                {/* Category label */}
                <Text
                  style={{
                    fontFamily: "Sora_600SemiBold",
                    fontSize: 9.5,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: SAGE_DARK,
                    opacity: 0.65,
                    marginBottom: 4,
                  }}
                >
                  {category === "All" ? cat : category}
                </Text>

                {/* Test items */}
                {products.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push(`/(app)/(lab)/${item.id}`)}
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      paddingVertical: 10,
                      borderBottomWidth:
                        idx < products.length - 1 ? 1 : 0,
                      borderBottomColor: HAIR,
                    }}
                  >
                    {/* Test icon */}
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        backgroundColor: SAGE_FOG,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Ionicons name="flask" size={17} color={SAGE_DARK} />
                    </View>

                    {/* Test info */}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          fontFamily: "Sora_600SemiBold",
                          fontSize: 11.5,
                          color: INK,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 9.5,
                          fontFamily: "Inter_400Regular",
                          color: INK_60,
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.biomarkers?.length
                          ? `${item.biomarkers.length} biomarkers`
                          : item.category || "General"}
                        {item.turnaroundDays
                          ? ` · ${item.turnaroundDays} days`
                          : ""}
                      </Text>
                    </View>

                    {/* Test price */}
                    <Text
                      style={{
                        fontFamily: "Sora_600SemiBold",
                        fontSize: 11.5,
                        color: INK,
                        alignSelf: "center",
                        flexShrink: 0,
                      }}
                    >
                      £{item.price.toFixed(2)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}
