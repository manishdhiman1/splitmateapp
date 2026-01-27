import { useSession } from "@/app/context/AuthContext";
import { auth, db } from "@/firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { signOut } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fetchRoom = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setRefreshing(true);
      const roomSnap = await getDocs(
        query(
          collection(db, "rooms"),
          where("participants", "array-contains", user.uid),
          where("status", "==", "active"),
        ),
      );

      if (!roomSnap.empty) {
        const roomSnapDt = roomSnap.docs[0];
        const roomData = roomSnapDt.data();
        let roommateId = "";

        if (user.email == roomData.ownerEmail) {
          roommateId = roomData.roommateId;
        } else {
          roommateId = roomData.ownerId;
        }
        const userSnap = await getDoc(doc(db, "users", roommateId));
        setRoom({
          id: roomSnapDt.id,
          ...roomSnapDt.data(),
          userData: userSnap.data(),
        });
      } else {
        setRoom(null);
      }
    } catch (error) {
      console.error("Fetch room error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    fetchRoom();
    return unsub;
  }, []);

  if (!user) return null; // or loader

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={22} color="#111827" />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchRoom} />
        }
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  user.photoURL ??
                  "https://ui-avatars.com/api/?name=" +
                    encodeURIComponent(user.displayName ?? "User"),
              }}
              style={styles.avatar}
            />
            <View style={styles.editIcon}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </View>

          <Text style={styles.name}>{user.displayName ?? "Unnamed User"}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>STATUS</Text>
            <Text style={styles.statusValue}>
              {room?.activeUserId == user?.uid
                ? "Your turn to pay"
                : "Not your turn"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>ROOMMATE</Text>
            <Text style={styles.statusValue}>
              {room?.userData?.name || "Not Assigned"}
            </Text>
          </View>
        </View>

        {/* Account Settings */}
        <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>

        <View style={styles.listCard}>
          <SettingsItem icon="settings-outline" title="General Settings" />
          <SettingsItem icon="notifications-outline" title="Notifications" />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>SUPPORT & LEGAL</Text>

        <View style={styles.listCard}>
          <SettingsItem icon="help-circle-outline" title="Help & Feedback" />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Reusable Row */
function SettingsItem({ icon, title }: { icon: any; title: string }) {
  return (
    <TouchableOpacity style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={16} color="#6366F1" />
        </View>
        <Text style={styles.rowText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  avatarWrapper: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20,
  },

  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },

  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#6366F1",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  email: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    flexDirection: "row",
    paddingVertical: 16,
    marginBottom: 24,
  },

  statusItem: {
    flex: 1,
    alignItems: "center",
  },

  statusLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },

  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },

  divider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginHorizontal: 20,
    marginBottom: 8,
  },

  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  rowText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    marginBottom: 30,
  },

  logoutText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
});
