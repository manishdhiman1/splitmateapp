import ManageRoomScreen from "@/app/screens/myRoom";
import StartRoomScreen from "@/app/screens/startRoom";
import { auth, db } from "@/firebase/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function RoomScreen() {
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRoom = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const roomSnap = await getDocs(
        query(
          collection(db, "rooms"),
          where("participants", "array-contains", user.uid),
          where("status", "==", "active"),
        ),
      );

      if (!roomSnap.empty) {
        setRoom({ id: roomSnap.docs[0].id, ...roomSnap.docs[0].data() });
      } else {
        setRoom(null);
      }
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to load room",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRoom();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRoom();
  }, []);

  if (loading) {
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]} // Android
            tintColor="#4F46E5" // iOS
          />
        }
      >
        {room && room.status == "active" ? (
          <ManageRoomScreen room={room} fetchRoom={fetchRoom} />
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
