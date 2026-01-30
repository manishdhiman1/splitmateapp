import { auth, db } from "@/firebase/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import TimeScroller from "../components/TimeScroller";

import {
    deleteReminderNotification,
    scheduleFixedReminder,
    scheduleIntervalReminder,
} from "@/utils/notification";
import { router, useLocalSearchParams } from "expo-router";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";

const days = ["M", "T", "W", "T", "F", "S", "S"];
const intervalOptions = [1, 5, 15, 30, 60, 120, 240, 480];

export default function AddReminderScreen() {
  const params = useLocalSearchParams();

  const reminderId = params.reminderId as string | undefined;
  const reminder = params.reminder
    ? JSON.parse(params.reminder as string)
    : null;

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedType, setSelectedType] = useState<"fixed" | "interval">(
    "fixed",
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([4]);

  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);

  const toggleDay = (index: number) => {
    setSelectedDays((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index],
    );
  };

  const [timeString, settimeString] = useState("12:00 AM");

  const saveReminder = async () => {
    let notificationIds: string[] = [];

    if (!name.trim()) {
      alert("Reminder name is required");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      if (reminderId && reminder.notificationIds.length != 0) {
        for (const nid of reminder.notificationIds) {
          await deleteReminderNotification(nid);
        }
      }

      if (selectedType === "fixed") {
        notificationIds = await scheduleFixedReminder({
          name,
          message,
          time: timeString,
          repeatDays: selectedDays,
        });
      }

      if (selectedType === "interval") {
        const id = await scheduleIntervalReminder({
          name,
          message,
          intervalMinutes,
        });
        notificationIds = [id];
      }

      const payload = {
        name: name.trim(),
        message: message.trim(),
        notificationIds,
        type: selectedType,
        time: selectedType === "fixed" ? timeString : null,
        intervalMinutes: selectedType === "interval" ? intervalMinutes : null,
        repeatDays: selectedType === "interval" ? selectedDays : null,
        isActive: true,
        updatedAt: serverTimestamp(),
      };

      if (reminderId) {
        // ✏️ EDIT
        await updateDoc(doc(db, "reminders", reminderId), payload);
      } else {
        // ADD

        await addDoc(collection(db, "reminders"), {
          ...payload,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      router.back();
    } catch (error) {
      console.error("Save reminder error:", error);
      alert("Failed to save reminder");
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async () => {
    if (!reminderId) return;

    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);

              if (reminder?.notificationIds?.length) {
                for (const id of reminder.notificationIds) {
                  await deleteReminderNotification(id);
                }
              }

              // 🗑 Delete from Firestore
              await deleteDoc(doc(db, "reminders", reminderId));

              router.back();
            } catch (error) {
              console.error("Delete reminder error:", error);
              Alert.alert("Error", "Failed to delete reminder");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    if (!reminder) return;

    setName(reminder.name ?? "");
    setMessage(reminder.message ?? "");
    setSelectedType(reminder.type ?? "fixed");
    settimeString(reminder.time ?? "12:00 AM");
    setSelectedDays(reminder.repeatDays ?? []);
    setIntervalMinutes(reminder.intervalMinutes ?? 5);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {reminderId ? "Edit Reminder" : "Add New Reminder"}
        </Text>

        <View style={{ width: 22 }} />
      </View>

      {/* Reminder Name */}
      <Text style={styles.label}>Reminder Name</Text>
      <View style={styles.input}>
        <Ionicons name="card-outline" size={18} color="#2563EB" />
        <TextInput
          placeholder="e.g. Credit Card Bill"
          placeholderTextColor="#94A3B8"
          style={styles.inputText}
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Message */}
      <Text style={styles.label}>Reminder Message</Text>
      <TextInput
        placeholder="Add a note (optional)..."
        placeholderTextColor="#94A3B8"
        style={styles.textArea}
        value={message}
        onChangeText={setMessage}
        multiline
      />

      {/* Type */}
      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === "fixed" && styles.typeActive,
          ]}
          onPress={() => setSelectedType("fixed")}
        >
          <Text
            style={[
              styles.typeText,
              selectedType === "fixed" && styles.typeTextActive,
            ]}
          >
            Fixed Time
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === "interval" && styles.typeActive,
          ]}
          onPress={() => setSelectedType("interval")}
        >
          <Text
            style={[
              styles.typeText,
              selectedType === "interval" && styles.typeTextActive,
            ]}
          >
            Interval
          </Text>
        </TouchableOpacity>
      </View>

      {selectedType === "interval" ? (
        <>
          <Text style={styles.label}>Repeat Every</Text>

          <View style={styles.intervalRow}>
            {intervalOptions.map((value) => {
              const active = intervalMinutes === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.intervalChip,
                    active && styles.intervalChipActive,
                  ]}
                  onPress={() => {
                    setIntervalMinutes(value);
                  }}
                >
                  <Text
                    style={[
                      styles.intervalText,
                      active && styles.intervalTextActive,
                    ]}
                  >
                    {value >= 60 ? value / 60 + " hour" : value + " min"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <TimeScroller settimeString={settimeString} timeString={timeString} />
      )}

      {selectedType != "interval" ? (
        <>
          {/* Repeat */}
          <Text style={styles.label}>Repeat on</Text>
          <View style={styles.daysRow}>
            {days.map((day, index) => {
              const active = selectedDays.includes(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.day, active && styles.dayActive]}
                  onPress={() => toggleDay(index)}
                >
                  <Text
                    style={[styles.dayText, active && styles.dayTextActive]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={{ fontSize: 20, marginTop: 20 }}>
          Interval repeats on every day.
        </Text>
      )}

      <View
        style={{
          flexDirection: "column",
          gap: 10,
          marginTop: 30,
        }}
      >
        {reminderId && (
          <TouchableOpacity
            style={[styles.deleteButton, saving && styles.saveButtonDisabled]}
            onPress={deleteReminder}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>Delete Reminder</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveReminder}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveText}>
                {reminderId ? "Update Reminder" : "Save Reminder"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 14,
    marginBottom: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  helper: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  intervalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },

  intervalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#E5EDFF",
  },

  intervalChipActive: {
    backgroundColor: "#2563EB",
  },

  intervalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },

  intervalTextActive: {
    color: "#FFFFFF",
  },

  customInterval: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },

  customLabel: {
    fontSize: 13,
    color: "#64748B",
  },

  customInput: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },

  customSuffix: {
    fontSize: 13,
    color: "#64748B",
  },

  inputText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
  },

  textArea: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 80,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
    textAlignVertical: "top",
  },

  typeRow: {
    flexDirection: "row",
    gap: 10,
  },

  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#E5EDFF",
    alignItems: "center",
  },

  typeActive: {
    backgroundColor: "#2563EB",
  },

  typeText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },

  typeTextActive: {
    color: "#FFFFFF",
  },

  timeBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  time: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
  },

  timeColon: {
    fontSize: 26,
    fontWeight: "700",
    color: "#94A3B8",
  },

  ampm: {
    alignItems: "center",
  },

  ampmActive: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  ampmInactive: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },

  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  day: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5EDFF",
    alignItems: "center",
    justifyContent: "center",
  },

  dayActive: {
    backgroundColor: "#2563EB",
  },

  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },

  dayTextActive: {
    color: "#FFFFFF",
  },

  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E5EDFF",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },

  infoText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },

  deleteButton: {
    backgroundColor: "#e00000",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "auto",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: "auto",
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
