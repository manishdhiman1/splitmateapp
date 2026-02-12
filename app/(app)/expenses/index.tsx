import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";

import ExpenseCard from "@/app/components/ExpenseCard";
import { auth, db } from "@/firebase/firebaseConfig";
import { useAppStore } from "@/store/app.store";
import sendExpensePush from "@/utils/notification";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

const ExpenseList = () => {
  const { room, roomId, roommate } = useAppStore();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const user = auth.currentUser;
  const PAGE_SIZE = 100;
  const [cycleSummary, setCycleSummary] = useState<any[]>([]);

  const fetchLast3Cycles = async () => {
    if (!roomId || !roommate?.uid || !user?.uid) return;

    try {
      const q = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        orderBy("cycleNumber", "desc"),
        limit(20), // get enough to extract 3 cycles
      );

      const snap = await getDocs(q);

      const allExpenses = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get unique cycle numbers (descending)
      const uniqueCycles = [
        ...new Set(allExpenses.map((e: any) => e.cycleNumber)),
      ].slice(0, 3);

      const summary = uniqueCycles.map((cycle) => {
        const cycleExpenses = allExpenses.filter(
          (e: any) => e.cycleNumber === cycle,
        );

        let myTotal = 0;
        let roommateTotal = 0;

        cycleExpenses.forEach((exp: any) => {
          if (exp.paidBy === user.uid) {
            myTotal += exp.amount;
          } else {
            roommateTotal += exp.amount;
          }
        });

        return {
          cycleNumber: cycle,
          myTotal,
          roommateTotal,
          total: myTotal + roommateTotal,
        };
      });

      setCycleSummary(summary);
    } catch (error) {
      console.error("Cycle summary error:", error);
    }
  };

  const openModal = () => {
    setShowExpenseModal(true);
  };

  const closeModal = () => {
    setShowExpenseModal(false);
  };

  const fetchExpenses = async () => {
    if (!roomId) return;

    try {
      setLoadingExpenses(true);
      setExpenses([]);

      const q = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        // where("roomId", "==", "dfsdf"),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setExpenses(list);
      // console.log("list", list);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Fetch expenses error:", error);
    } finally {
      setLoadingExpenses(false);
      // console.log("room", room);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchLast3Cycles();
  }, [roomId]);

  const fetchMoreExpenses = async () => {
    if (!roomId || !lastDoc || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);

      const q = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        // where("roomId", "==", "sdfsdf"),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setExpenses((prev) => [...prev, ...list]);
      // console.log("expenses", expenses);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === 10);
    } catch (error) {
      console.error("Fetch more error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const sendReminder = () => {
    if (roommate?.notifyToken) {
      sendExpensePush(
        [roommate?.notifyToken],
        `Please add expense of today.`,
        "Add Today Expense.",
      );
      ToastAndroid.show("Reminder Sent", ToastAndroid.SHORT);
    } else {
      ToastAndroid.show(
        "Please ask your roommate to turn on notification.",
        ToastAndroid.SHORT,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
      {/* Recent Activity */}
      <View style={{ marginBottom: 16 }}>
        <FlatList
          data={cycleSummary}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.cycleNumber.toString()}
          contentContainerStyle={{ gap: 14, marginBottom: 20 }}
          renderItem={({ item }) => {
            const balance = item.myTotal - item.roommateTotal;
            const isPositive = balance > 0;

            return (
              <View style={styles.cycleCard}>
                <View style={styles.cycleHeader}>
                  <Text style={styles.cycleNumber}>
                    Cycle {item.cycleNumber}
                  </Text>
                </View>

                <View style={styles.cycleRow}>
                  <View>
                    <Text style={styles.cycleLabel}>You</Text>
                    <Text style={styles.cycleAmount}>₹{item.myTotal}</Text>
                  </View>

                  <View>
                    <Text style={styles.cycleLabel}>{roommate?.name}</Text>
                    <Text style={styles.cycleAmount}>
                      ₹{item.roommateTotal}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      <View style={styles.activityCard}>
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshing={loadingExpenses}
          onRefresh={() => {
            fetchExpenses();
            fetchLast3Cycles();
          }}
          renderItem={({ item }) => (
            <ExpenseCard expense={item} fetchExpenses={fetchExpenses} />
          )}
          contentContainerStyle={{ paddingBottom: 10 }}
          onEndReached={fetchMoreExpenses}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            loadingExpenses ? (
              <View
                style={{
                  justifyContent: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                  style={{ marginVertical: 16 }}
                />
                <Text style={{ color: "#6B7280", marginTop: 10 }}>
                  Loading Expenses...
                </Text>
              </View>
            ) : (
              <View
                style={{
                  justifyContent: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#6B7280", marginTop: 10 }}>
                  No expenses added yet
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View
                style={{
                  justifyContent: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ActivityIndicator
                  size="small"
                  color="#4F46E5"
                  style={{ marginVertical: 16 }}
                />
                <Text style={{ color: "#6B7280", marginTop: 10 }}>
                  Loading More...
                </Text>
              </View>
            ) : expenses.length != 0 ? (
              <View
                style={{
                  justifyContent: "center",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: "#6B7280", marginTop: 10 }}>
                  No More Records
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
};

export default ExpenseList;

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    color: "#111827",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
  },

  activityCard: {
    backgroundColor: "#FFFFFF",
    // backgroundColor: "red",
    borderRadius: 16,
    padding: 14,
    flexDirection: "column",
    // justifyContent: "space-between",
    // alignItems: "center",
    // marginBottom: 300,
    // position: "relative",
    // bottom: 100,
    // height: 500,
    // minHeight: 250,
    // maxHeight: 600,
    paddingBottom: 180,
  },

  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,

    flexDirection: "row",
    alignItems: "center",
    gap: 8,

    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 28,

    // Android shadow
    elevation: 6,

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  fabText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  activityTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  activitySub: {
    fontSize: 11,
    color: "#6B7280",
  },

  activityRight: {
    alignItems: "flex-end",
  },

  activityAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },

  activitySplit: {
    fontSize: 10,
    color: "#6B7280",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  cycleTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    color: "#111827",
  },

  cycleCard: {
    width: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  cycleHeader: {
    backgroundColor: "#EEF2FF",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
  },

  cycleNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },

  cycleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  cycleLabel: {
    fontSize: 11,
    color: "#6B7280",
  },

  cycleAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  cycleDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },

  balanceText: {
    fontSize: 12,
    fontWeight: "600",
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

  startCycleButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  cycleButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginLeft: 6,
  },

  completeCycleButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  completeCycleText: {
    color: "#4F46E5",
    fontWeight: "700",
    marginLeft: 6,
  },

  expenseButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 14,
    padding: 8,
    flexDirection: "row",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    // gap: 8,
    // marginTop: 20,
  },

  expenseButtonText: {
    color: "#FFFFFF",
  },
});
