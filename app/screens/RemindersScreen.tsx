import { auth, db } from "@/firebase/firebaseConfig";
import {
    deleteReminderNotification,
    scheduleFixedReminder,
    scheduleIntervalReminder,
} from "@/utils/notification";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Reminder = {
  id: string;
  name: string;
  message: string;
  time: string;
  repeatDays: number[];
  isActive: boolean;
};

export default function RemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchReminders = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);

      const q = query(
        collection(db, "reminders"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      const list: Reminder[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Reminder, "id">),
      }));

      setReminders(list);
    } catch (error) {
      console.error("Fetch reminders error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, []),
  );
  const toggleSwitch = async (id: string, current: boolean) => {
    const reminder: any = reminders.find((r) => r.id === id);
    if (!reminder) return;

    try {
      // 🔄 Optimistic UI update
      setReminders((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: !current } : item,
        ),
      );

      let newNotificationIds: string[] = [];

      if (current) {
        // 🔴 TURN OFF → cancel notifications
        if (reminder.notificationIds?.length) {
          for (const nid of reminder.notificationIds) {
            await deleteReminderNotification(nid);
          }
        }

        newNotificationIds = [];
      } else {
        // 🟢 TURN ON → reschedule notifications
        if (reminder.type === "fixed") {
          newNotificationIds = await scheduleFixedReminder({
            name: reminder.name,
            message: reminder.message,
            time: reminder.time,
            repeatDays: reminder.repeatDays,
          });
        }

        if (reminder.type === "interval") {
          const nid = await scheduleIntervalReminder({
            name: reminder.name,
            message: reminder.message,
            intervalMinutes: reminder.intervalMinutes,
            repeatDays: reminder.repeatDays,
          });
          newNotificationIds = [nid];
        }
      }

      // 🔥 Persist change
      await updateDoc(doc(db, "reminders", id), {
        isActive: !current,
        notificationIds: newNotificationIds,
        updatedAt: serverTimestamp(),
      });

      // ✅ Sync local state notificationIds
      setReminders((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, notificationIds: newNotificationIds }
            : item,
        ),
      );
    } catch (error) {
      console.error("Toggle error:", error);

      // 🔙 Rollback UI on failure
      setReminders((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isActive: current } : item,
        ),
      );

      alert("Failed to update reminder");
    }
  };

  const getRepeatLabel = (repeatDays: number[]) => {
    if (repeatDays.length === 7) return "Daily";
    if (repeatDays.length === 1) return "Once";
    return "Custom days";
  };

  const handleLongPress = (item: any) => {
    Alert.alert(
      "Reminder Options",
      item.name,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDelete(item),
        },
      ],
      { cancelable: true },
    );
  };

  const confirmDelete = (item: any) => {
    Alert.alert(
      "Delete Reminder",
      "This reminder will be permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReminder(item),
        },
      ],
    );
  };

  const deleteReminder = async (item: any) => {
    try {
      // 🔕 Cancel all notifications
      if (item.notificationIds?.length) {
        for (const id of item.notificationIds) {
          await deleteReminderNotification(id);
        }
      }

      // 🗑 Delete Firestore doc
      await deleteDoc(doc(db, "reminders", item.id));
    } catch (error) {
      console.error("Delete reminder error:", error);
      Alert.alert("Error", "Failed to delete reminder");
    } finally {
      fetchReminders();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Reminders</Text>
      <Text style={styles.subtitle}>
        Manage your notification preferences and stay on top of your financial
        goals.
      </Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : reminders.length === 0 ? (
        <Text>No reminders yet</Text>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchReminders}
          renderItem={({ item }: any) => (
            <View key={item.id} style={styles.card}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/screens/AddReminderScreen",
                    params: {
                      reminderId: item.id,
                      reminder: JSON.stringify(item),
                    },
                  })
                }
                onLongPress={() => handleLongPress(item)}
                style={styles.left}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: "#2563EB20" }]}
                >
                  <Ionicons name="time-outline" size={22} color="#2563EB" />
                </View>

                <View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.message}</Text>
                  <Text style={styles.cardSubtitle}>
                    {item.type === "interval"
                      ? `Every ${item?.intervalMinutes} min`
                      : item.time}
                    {" • "}
                    {getRepeatLabel(item.repeatDays)}
                  </Text>
                </View>
              </TouchableOpacity>
              <Switch
                value={item.isActive}
                onValueChange={() => toggleSwitch(item.id, item.isActive)}
                trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}
        />
      )}

      {/* Reminder Cards
      {reminders.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.left}>
            <View
              style={[styles.iconBox, { backgroundColor: item.color + "20" }]}
            >
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>

            <View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
          </View>

          <Switch
            value={item.enabled}
            onValueChange={() => toggleSwitch(item.id)}
            trackColor={{ false: "#E5E7EB", true: "#2563EB" }}
            thumbColor="#FFFFFF"
          />
        </View>
      ))} */}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        // href={"/screens/AddReminderScreen"}
        onPress={() => router.navigate("/screens/AddReminderScreen")}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add New Reminder</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },

  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },

  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
