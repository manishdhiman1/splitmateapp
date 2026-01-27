import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function DetailRow({ label, value }: any) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ExpenseCard({ expense }: any) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <View style={styles.card}>
          <View style={styles.left}>
            <View style={styles.icon}>
              <Ionicons
                name={
                  expense.category === "Food"
                    ? "fast-food"
                    : expense.category === "Rent"
                      ? "home"
                      : expense.category === "Travel"
                        ? "airplane"
                        : "flash"
                }
                size={16}
                color="#6366F1"
              />
            </View>

            <View>
              <Text style={styles.title}>
                {expense.paidByName.split(" ")[0]}
              </Text>
              <Text style={styles.sub}>
                {expense.category} •{" "}
                {expense.expenseDate?.toDate().toDateString()}
              </Text>
            </View>
          </View>

          <Text style={styles.amount}>₹{expense.amount}</Text>
        </View>
      </TouchableOpacity>
      {/* MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Expense Details</Text>

            <DetailRow label="Paid By" value={expense.paidByName} />
            <DetailRow label="Category" value={expense.category} />
            <DetailRow label="Amount" value={`₹${expense.amount}`} />
            <DetailRow
              label="Date"
              value={expense.expenseDate?.toDate().toDateString()}
            />

            <DetailRow
              label="Note"
              value={expense.note ? expense.note : "No additional notes"}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  sub: {
    fontSize: 11,
    color: "#6B7280",
  },
  amount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4F46E5",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },

  label: {
    fontSize: 11,
    color: "#6B7280",
  },

  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  note: {
    fontSize: 13,
    color: "#374151",
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },

  noteBlock: {
    marginTop: 12,
  },
});
