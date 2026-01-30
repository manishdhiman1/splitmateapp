import RemindersScreen from "@/app/screens/RemindersScreen";
import { useAppStore } from "@/store/app.store";
// import * as Notifications from "expo-notifications";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReminderScreen() {
  const { fetchRoom, room, roomLoading } = useAppStore();

  // const not = async () => {
  //   const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  //   console.log("Scheduled notifications:", scheduled.length);
  // };
  // not();
  if (roomLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ marginTop: 10, color: "#6B7280" }}>Loading room...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <RemindersScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // padding: 24,
    backgroundColor: "#F9FAFB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
