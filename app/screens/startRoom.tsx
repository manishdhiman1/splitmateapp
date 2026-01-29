import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "@/firebase/firebaseConfig";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useState } from "react";
import Toast from "react-native-toast-message";

export default function StartRoomScreen(roomData: any) {
  const { fetchRoom } = roomData;
  const [roomName, setRoomName] = useState("");
  const [roommateEmail, setRoommateEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const createRoom = async () => {
    if (!roomName || !roommateEmail) {
      Toast.show({
        type: "error",
        text1: "Missing details",
        text2: "Please fill all fields",
      });
      return;
    }

    const user = auth.currentUser;
    if (user?.email == roommateEmail) {
      Toast.show({
        type: "error",
        text1: "Cannot invite yourself",
        text2: "Please enter your roommate's email. Or ask them to invite you.",
      });
      return;
    }

    if (!user) {
      Toast.show({
        type: "error",
        text1: "Not logged in",
        text2: "Please login again",
      });
      return;
    }

    try {
      setLoading(true);

      // 🔍 Check if roommate exists
      const q = query(
        collection(db, "users"),
        where("email", "==", roommateEmail),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Toast.show({
          type: "error",
          text1: "User not found",
          text2: "No user exists with this email",
        });
        return;
      }

      const roommateId = querySnapshot.docs[0].id;

      const activeRoomQuery = query(
        collection(db, "rooms"),
        where("participants", "array-contains", roommateId),
        where("status", "==", "active"),
      );

      const activeRoomSnap = await getDocs(activeRoomQuery);

      if (!activeRoomSnap.empty) {
        Toast.show({
          type: "error",
          text1: "Roommate already in a room",
          text2: "This user is already part of another active room",
        });
        return;
      }

      // ✅ Roommate exists → create room
      await addDoc(collection(db, "rooms"), {
        name: roomName,
        ownerId: user.uid,
        ownerEmail: user.email,
        roommateEmail,
        targetAmount: 1000,
        participants: [user.uid, querySnapshot.docs[0].id],
        roommateId: querySnapshot.docs[0].id,
        status: "active",
        createdAt: serverTimestamp(),
      });

      Toast.show({
        type: "success",
        text1: "Room created",
        text2: "Invitation sent to roommate",
      });

      setRoomName("");
      setRoommateEmail("");
      fetchRoom();
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Something went wrong",
        text2: "Failed to create room",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Setup New Room</Text>
      <Text style={styles.subtitle}>
        Invite your roommate to start tracking turns.
      </Text>

      {/* Room Name */}
      <Text style={styles.label}>Room Name</Text>
      <TextInput
        placeholder="e.g. Apartment 204"
        value={roomName}
        onChangeText={setRoomName}
        placeholderTextColor="#9CA3AF"
        style={styles.input}
      />

      {/* Roommate Email */}
      <Text style={styles.label}>Roommate's Email</Text>
      <TextInput
        placeholder="email@example.com"
        placeholderTextColor="#9CA3AF"
        value={roommateEmail}
        onChangeText={setRoommateEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#6366F1" />
        <Text style={styles.infoText}>
          Your roommate will receive an invitation to join this room. Only one
          room can be active at a time.
        </Text>
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={createRoom}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating..." : "Create Room"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F9FAFB",
  },

  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EEF2FF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 28,
  },

  infoText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#4338CA",
    flex: 1,
    lineHeight: 18,
  },

  button: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
