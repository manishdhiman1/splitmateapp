import ManageRoomScreen from "@/app/screens/myRoom";
import StartRoomScreen from "@/app/screens/startRoom";
import { useAppStore } from "@/store/app.store";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RoomScreen() {
  const { fetchRoom, room, roomLoading } = useAppStore();

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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={roomLoading}
            onRefresh={fetchRoom}
            colors={["#4F46E5"]} // Android
            tintColor="#4F46E5" // iOS
          />
        }
      >
        {room && room.status == "active" ? (
          <ManageRoomScreen />
        ) : (
          <StartRoomScreen fetchRoom={fetchRoom} />
        )}
      </ScrollView>
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
