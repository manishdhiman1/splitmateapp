import { useAppStore } from "@/store/app.store";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StatusBar, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TabLayout() {
  const { globalLoading, refreshAll } = useAppStore();

  useEffect(() => {
    refreshAll();
  }, []);

  if (globalLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size={80} color="#4F46E5" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading Data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // initialRouteName="reminders/index"
    >
      <Tabs.Screen
        name="(home)/index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="room/index"
        options={{
          title: "Rooms",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="reminders/index"
        options={{
          title: "Reminders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alarm" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
