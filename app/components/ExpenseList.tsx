import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ExpenseCard from "@/app/components/ExpenseCard";
import { db } from "@/firebase/firebaseConfig";
import { useAppStore } from "@/store/app.store";
import { Ionicons } from "@expo/vector-icons";
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
import AddExpenses from "./AddExpense";

const ExpenseList = ({
  fetchCycleTotal,
  loadingExpenses,
  setLoadingExpenses,
}: any) => {
  const { room, roomId } = useAppStore();
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const PAGE_SIZE = 5;

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
        orderBy("expenseDate", "desc"),
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
      fetchCycleTotal(room);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [roomId]);

  const fetchMoreExpenses = async () => {
    if (!roomId || !lastDoc || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);

      const q = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        // where("roomId", "==", "sdfsdf"),
        orderBy("expenseDate", "desc"),
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

  return (
    <>
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {/* Recent Activity */}
      <View style={styles.activityCard}>
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          refreshing={loadingExpenses}
          onRefresh={fetchExpenses}
          renderItem={({ item }) => <ExpenseCard expense={item} />}
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
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <AddExpenses
        fetchExpenses={fetchExpenses}
        showExpenseModal={showExpenseModal}
        closeModal={closeModal}
      />
    </>
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

  activityCard: {
    backgroundColor: "#FFFFFF",
    // backgroundColor: "red",
    borderRadius: 16,
    padding: 14,
    flexDirection: "column",
    // justifyContent: "space-between",
    // alignItems: "center",
    // marginBottom: 40,
    height: 300,
  },

  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#4F46E5",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
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
});
