import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { auth, db } from "@/firebase/firebaseConfig";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Toast from "react-native-toast-message";

import { useAppStore } from "@/store/app.store";
import sendExpensePush from "@/utils/notification";
import DateTimePicker from "@react-native-community/datetimepicker";

const AddExpenses = (expenseData: any) => {
  const { showExpenseModal, closeModal, fetchExpenses } = expenseData;
  const [amount, setAmount] = useState("0");
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { roomId, room } = useAppStore();
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) return "Today";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (showExpenseModal) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showExpenseModal]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -1,
      duration: 500,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        closeModal();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,

      onPanResponderMove: (_, gesture) => {
        console.log("start");
        if (gesture.dy > 0) {
          slideAnim.setValue(1 - gesture.dy / 400);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        console.log("end");
        if (gesture.dy > 120) {
          handleClose();
        } else {
          Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const onNumberPress = (num: string) => {
    setAmount((prev) => (prev === "0" ? num : prev + num));
  };

  const onBackspace = () => {
    setAmount((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  };

  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const saveExpense = async () => {
    if (amount === "0") {
      Toast.show({
        type: "error",
        text1: "Invalid amount",
        text2: "Please enter a valid amount",
      });
      return;
    }

    if (!note) {
      Toast.show({
        type: "error",
        text1: "Invalid Note",
        text2: "Please enter a valid Note",
      });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSavingExpense(true);
      // 1️⃣ Add expense (TOP-LEVEL collection)
      await addDoc(collection(db, "expenses"), {
        roomId: roomId,
        amount: Number(amount),
        category,
        note,
        paidBy: user.uid,
        cycleNumber: room.cycleNumber || null,
        cycleUserId: room.activeUserId || null,
        paidByEmail: user.email,
        paidByName: user.displayName,
        expenseDate: expenseDate,
        createdAt: serverTimestamp(),
        date: serverTimestamp(),
      });

      // 2️⃣ Update room summary
      roomId &&
        (await updateDoc(doc(db, "rooms", roomId), {
          lastExpenseAt: serverTimestamp(),
        }));

      Toast.show({
        type: "success",
        text1: "Expense added successfully",
      });

      let roommateId = "";

      if (room.ownerId === user.uid) {
        roommateId = room.roommateId;
      } else {
        roommateId = room.ownerId;
      }

      const roommateSnap = await getDoc(doc(db, "users", roommateId));

      const token = roommateSnap.data()?.notifyToken;

      sendExpensePush(
        [token],
        `${user.displayName} added ₹${amount} for ${note}`,
      );

      // Reset state
      fetchExpenses();
      setAmount("0");
      setCategory("Food");
      setNote("");
      closeModal();
      return;
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to add expense",
      });
    } finally {
      setSavingExpense(false);
    }
  };

  return (
    <Modal visible={showExpenseModal} transparent animationType="none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Backdrop */}
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}
        />

        {/* Bottom Sheet */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [500, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add New Expense</Text>
              <Ionicons name="close" size={20} onPress={handleClose} />
            </View>

            {/* Amount */}
            <View style={styles.amountRow}>
              <Text style={styles.currency}>₹</Text>
              <Text style={styles.amount}>{amount}</Text>
            </View>
            <View style={styles.keypad}>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={styles.key}
                  onPress={() => onNumberPress(n)}
                >
                  <Text style={styles.keyText}>{n}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.key} />

              <TouchableOpacity
                style={styles.key}
                onPress={() => onNumberPress("0")}
              >
                <Text style={styles.keyText}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.key} onPress={onBackspace}>
                <Ionicons name="backspace-outline" size={22} />
              </TouchableOpacity>
            </View>
            {/* Category */}
            <Text style={styles.sheetLabel}>Category</Text>

            <View style={styles.categoryRow}>
              {["Food", "Rent", "Travel", "Other"].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.categoryItem,
                    category === item && styles.categoryItemActive,
                  ]}
                  onPress={() => setCategory(item)}
                >
                  <Ionicons
                    name={
                      item === "Food"
                        ? "fast-food"
                        : item === "Rent"
                          ? "home"
                          : item === "Travel"
                            ? "airplane"
                            : "flash"
                    }
                    size={18}
                    color={category === item ? "#FFFFFF" : "#4F46E5"}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && { color: "#FFFFFF" },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Input */}
            <TextInput
              placeholder="What was this for?"
              value={note}
              onChangeText={setNote}
              multiline
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />

            {/* Date */}
            <View style={styles.dateRow}>
              {/* Date */}
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} />
                <Text style={styles.dateText}>{formatDate(expenseDate)}</Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={expenseDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()} // no future dates
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setExpenseDate(selectedDate);
                  }
                }}
              />
            )}

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, savingExpense && { opacity: 0.6 }]}
              onPress={saveExpense}
              disabled={savingExpense}
            >
              {savingExpense ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save Expense</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddExpenses;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  categoryItemActive: {
    backgroundColor: "#4F46E5",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },

  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 20,
  },

  currency: {
    fontSize: 22,
    marginRight: 4,
    color: "#4F46E5",
  },

  amount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#4F46E5",
  },

  sheetLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
  },

  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  categoryItem: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryText: {
    fontSize: 10,
    marginTop: 4,
    color: "#4F46E5",
  },

  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    marginBottom: 14,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  dateText: {
    marginLeft: 6,
    color: "#4F46E5",
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  saveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  key: {
    width: "30%",
    height: 56,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  keyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
});
