import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "@/firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";

export default function ManageRoomScreen(roomData: any) {
  const user = auth.currentUser;
  const { room, fetchRoom } = roomData;
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetAmount, setTargetAmount] = useState(
    room.targetAmount?.toString() || "1000",
  );
  const [saving, setSaving] = useState(false);
  const [leaving, setleaving] = useState(false);
  const updateTarget = async () => {
    if (!targetAmount) return;

    try {
      setSaving(true);

      await updateDoc(doc(db, "rooms", room.id), {
        targetAmount: Number(targetAmount),
        updatedAt: new Date(),
      });

      Toast.show({
        type: "success",
        text1: "Target updated",
      });

      setShowTargetModal(false);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to update target",
      });
    } finally {
      setSaving(false);
    }
  };

  const leaveRoom = async () => {
    if (!room) return;

    if (user?.uid != room.ownerId) {
      Toast.show({
        type: "error",
        text1: "Only owner can delete the room",
        text2: "Contact your roommate to delete the room",
      });
      return;
    }
    try {
      setleaving(true);
      await updateDoc(doc(db, "rooms", room.id), {
        status: "inactive",
        leftAt: new Date(),
      });

      Toast.show({
        type: "success",
        text1: "Left room",
        text2: "You have left the room successfully",
      });

      // Parent RoomScreen will auto-refresh on pull / remount
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to leave room",
      });
    } finally {
      fetchRoom();
      setleaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={22} color="#111827" />
        <Text style={styles.headerTitle}>Manage Room</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Room Card */}
        <View style={styles.roomCard}>
          <TouchableOpacity style={styles.editIcon}>
            <Ionicons name="pencil" size={16} color="#6366F1" />
          </TouchableOpacity>

          <View style={styles.roomIcon}>
            <Ionicons name="home" size={26} color="#6366F1" />
          </View>

          <Text style={styles.roomName}>{room.name}</Text>

          <Text style={styles.roomDate}>
            Created {room.createdAt?.toDate().toLocaleDateString()}
          </Text>
          <Text style={styles.roomDate}>Created By: {room.ownerEmail}</Text>

          {/* Users */}
          <View style={styles.userRow}>
            {user?.photoURL && (
              <Image source={{ uri: user?.photoURL }} style={styles.avatar} />
            )}
            <View>
              <Text style={styles.userRole}>YOU</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.userRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userRole}>ROOMMATE</Text>
              <Text style={styles.userEmail}>
                {user?.email == room.ownerEmail
                  ? room.roommateEmail
                  : room.ownerEmail}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Financial Settings */}
        <Text style={styles.sectionTitle}>FINANCIAL SETTINGS</Text>

        <View style={styles.financialCard}>
          <View style={styles.financialLeft}>
            <View style={styles.financialIcon}>
              <Ionicons name="wallet-outline" size={18} color="#6366F1" />
            </View>
            <Text style={styles.financialLabel}>Cycle Target Amount</Text>
          </View>
          <Text style={styles.financialValue}>₹{targetAmount}</Text>
        </View>

        {/* Change Target */}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => setShowTargetModal(true)}
        >
          <Ionicons name="repeat-outline" size={18} color="#6366F1" />
          <Text style={styles.changeText}>Change Target</Text>
        </TouchableOpacity>

        {/* Leave Room */}
        <TouchableOpacity
          style={styles.leaveButton}
          disabled={leaving}
          onPress={leaveRoom}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.leaveText}>
            {leaving ? "Delete..." : "Delete Room"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.leaveNote}>
          Leaving the room will remove your access to shared expenses and
          history.
        </Text>
      </ScrollView>

      {showTargetModal && (
        <Modal visible={showTargetModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Change Target Amount</Text>

              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                keyboardType="number-pad"
                style={styles.modalInput}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowTargetModal(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={updateTarget} disabled={saving}>
                  <Text style={styles.saveText}>
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "red",
    // flex: 1,
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

  roomCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    margin: 20,
    padding: 20,
  },

  editIcon: {
    position: "absolute",
    top: 16,
    right: 16,
  },

  roomIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  roomName: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
  },

  roomDate: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },

  userRole: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6366F1",
  },

  userEmail: {
    fontSize: 13,
    color: "#111827",
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginHorizontal: 20,
    marginBottom: 8,
  },

  financialCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  financialLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  financialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  financialLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  financialValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F46E5",
  },

  changeButton: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#4F46E5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  changeText: {
    marginLeft: 6,
    color: "#4F46E5",
    fontWeight: "700",
  },

  leaveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  leaveText: {
    marginLeft: 6,
    color: "#EF4444",
    fontWeight: "700",
  },

  leaveNote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginHorizontal: 40,
    marginTop: 6,
    marginBottom: 30,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  cancelText: {
    marginRight: 20,
    color: "#6B7280",
    fontWeight: "600",
  },

  saveText: {
    color: "#4F46E5",
    fontWeight: "700",
  },
});
