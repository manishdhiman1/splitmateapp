import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { auth, db } from "@/firebase/firebaseConfig";
import { useAppStore } from "@/store/app.store";
import sendExpensePush from "@/utils/notification";

const CATEGORIES = ["Groceries", "Veg", "Dinner", "Other"];

export default function AddExpenses({
  showExpenseModal,
  closeModal,
  fetchExpenses,
}: any) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { roomId, room, roommate } = useAppStore();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addMore, setAddMore] = useState(false);
  const amountInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (showExpenseModal) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        // wait for modal + animation to finish
        setTimeout(() => {
          amountInputRef.current?.focus();
        }, 100);
      });
    }
  }, [showExpenseModal]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: -1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => closeModal());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) slideAnim.setValue(1 - g.dy / 400);
      },
      onPanResponderRelease: (_, g) => {
        g.dy > 120
          ? handleClose()
          : Animated.spring(slideAnim, {
              toValue: 1,
              useNativeDriver: false,
            }).start();
      },
    }),
  ).current;

  /* ---------- Save Expense ---------- */
  const saveExpense = async () => {
    if (!amount || amount === "0") {
      Toast.show({ type: "error", text1: "Enter valid amount" });
      return;
    }

    if (category === "Other" && !note.trim()) {
      Toast.show({ type: "error", text1: "Please add a note" });
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setSaving(true);

      await addDoc(collection(db, "expenses"), {
        roomId,
        amount: Number(amount),
        category,
        note,
        paidBy: user.uid,
        paidByName: user.displayName,
        paidByEmail: user.email,
        cycleNumber: room.cycleNumber || null,
        cycleUserId: room.activeUserId || null,
        expenseDate,
        createdAt: serverTimestamp(),
      });

      roomId &&
        (await updateDoc(doc(db, "rooms", roomId), {
          lastExpenseAt: serverTimestamp(),
        }));

      sendExpensePush(
        [roommate?.notifyToken],
        `${user.displayName} added ₹${amount}`,
      );

      Toast.show({ type: "success", text1: "Expense added" });
      fetchExpenses();

      setAmount("");
      setCategory("Groceries");
      setNote("");
      setExpenseDate(new Date());
      if (!addMore) {
        handleClose();
      }
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to save expense" });
    } finally {
      setSaving(false);
    }
  };

  const paddingAnim = useRef(new Animated.Value(40)).current;
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setIsKeyboardOpen(true);
      Animated.timing(paddingAnim, {
        toValue: e.endCoordinates.height + 30,
        duration: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardOpen(false);
      Animated.timing(paddingAnim, {
        toValue: 40,
        duration: 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    });

    Keyboard.addListener("keyboardDidShow", () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal
      visible={showExpenseModal}
      transparent
      onRequestClose={() => {
        if (isKeyboardOpen) {
          Keyboard.dismiss();
          return;
        }

        handleClose();
      }}
    >
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          Keyboard.dismiss();
          handleClose();
        }}
      />

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            paddingBottom: paddingAnim,
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
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Expense</Text>
            <Ionicons name="close" size={20} onPress={handleClose} />
          </View>

          {/* Categories */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.category,
                  category === c && styles.categoryActive,
                ]}
                onPress={() => setCategory(c)}
              >
                <Text style={{ color: category === c ? "#FFF" : "#4F46E5" }}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note only for Other */}
          {category === "Other" && (
            <TextInput
              placeholder="What was this for?"
              value={note}
              multiline
              onChangeText={setNote}
              style={styles.input}
              placeholderTextColor="#9CA3AF"
            />
          )}

          {/* Date */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} />
            <Text style={styles.dateText}>{expenseDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={expenseDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, d) => {
                setShowDatePicker(false);
                d && setExpenseDate(d);
              }}
            />
          )}

          {/* Amount */}
          {/* Amount Input */}
          <View style={styles.amountRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              ref={amountInputRef}
              value={amount}
              onChangeText={(text) => {
                // allow only numbers
                const cleaned = text.replace(/[^0-9]/g, "");
                setAmount(cleaned === "" ? "" : cleaned);
              }}
              keyboardType="numeric"
              inputMode="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              style={styles.amountInput}
              autoFocus={false}
            />
          </View>

          {/* Add More */}
          <TouchableOpacity
            style={styles.addMore}
            onPress={() => setAddMore(!addMore)}
          >
            <Ionicons
              name={addMore ? "checkbox" : "square-outline"}
              size={18}
              color="#4F46E5"
            />
            <Text style={styles.addMoreText}>Add another expense</Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            disabled={saving}
            onPress={saveExpense}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: { fontSize: 16, fontWeight: "700" },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  category: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
  },
  categoryActive: { backgroundColor: "#4F46E5" },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: "black",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dateText: { color: "#4F46E5", fontWeight: "600" },

  amountRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 0,
    alignContent: "center",
    alignItems: "center",
  },
  currency: { fontSize: 30, color: "#4F46E5" },
  amount: { fontSize: 36, fontWeight: "700", color: "#4F46E5" },
  amountInput: {
    fontSize: 36,
    fontWeight: "700",
    color: "#4F46E5",
    textAlign: "center",
    minWidth: 60,
  },
  addMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  addMoreText: { color: "#4F46E5", fontWeight: "600", fontSize: 13 },
  saveButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
