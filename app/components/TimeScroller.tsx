import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TimerPickerModal } from "react-native-timer-picker";
export default function TimeScroller({ timeString, settimeString }: any) {
  const [showPicker, setShowPicker] = useState(false);

  const formatTime = ({
    hours,
    minutes,
  }: {
    hours?: number;
    minutes?: number;
  }) => {
    if (hours === undefined || minutes === undefined) return timeString;
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHour = hours % 12 || 12;

    return `${String(formattedHour).padStart(2, "0")}:${String(
      minutes,
    ).padStart(2, "0")} ${period}`;
  };

  return (
    <View style={{ marginTop: 20 }}>
      {/* Pill UI */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.pill}
        onPress={() => setShowPicker(true)}
      >
        <View style={styles.left}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={20} color="#ffff" />
          </View>
          <Text style={styles.label}>Select Time</Text>
        </View>

        <View style={styles.timeChip}>
          <Text style={styles.timeText}>{timeString}</Text>
          <Ionicons name="chevron-down" size={14} color="#93C5FD" />
        </View>
      </TouchableOpacity>

      {/* Time Picker Modal (LIGHT THEME) */}
      <TimerPickerModal
        visible={showPicker}
        setIsVisible={setShowPicker}
        onCancel={() => setShowPicker(false)}
        closeOnOverlayPress
        hideSeconds
        use12HourPicker
        modalTitle="Pick Time"
        initialValue={timeString}
        // hourLabel="Hours"
        minuteLabel="Min."
        // modalTitle="Select Time"
        cancelButton={
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.saveText}>Cancel</Text>
          </TouchableOpacity>
        }
        confirmButton={
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        }
        onConfirm={(pickedDuration) => {
          settimeString(formatTime(pickedDuration));
          setShowPicker(false);
        }}
        modalProps={{
          overlayOpacity: 0.3,
        }}
        styles={{
          theme: "light",
          backgroundColor: "#f2f2f2",
          text: { color: "#000000" },
          labelOffsetPercentage: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f2f2f2",
    padding: 18,
    borderRadius: 18,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },

  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },

  timeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  cancelButton: {
    backgroundColor: "#eb2525",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 10,
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
    paddingHorizontal: 24,
    marginHorizontal: 30,
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
