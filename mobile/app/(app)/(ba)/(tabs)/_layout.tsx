import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { Platform } from "react-native";

export default function BATabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.text,
        tabBarInactiveTintColor: "#9AA0AC",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: t.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 8.5,
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: "Work",
          tabBarActiveTintColor: t.colors.work,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={size}
              color={focused ? t.colors.work : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarActiveTintColor: t.colors.community,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size}
              color={focused ? t.colors.community : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "menu" : "menu-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
