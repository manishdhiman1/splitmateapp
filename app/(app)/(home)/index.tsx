import { auth } from "../../../firebase/firebaseConfig";

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ExpenseList from "@/app/components/ExpenseList";
import { db } from "@/firebase/firebaseConfig";
import { useAppStore } from "@/store/app.store";
import sendExpensePush from "@/utils/notification";
import registerForPushNotificationsAsync from "@/utils/registerForPush";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function HomeScreen() {
  const user = auth.currentUser;
  const { room, roomId, roommateId, fetchRoom, roommate } = useAppStore();

  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [canStartCycle, setCanStartCycle] = useState(false);

  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleTotal, setCycleTotal] = useState(0);
  const [rcycleTotal, setrCycleTotal] = useState(0);
  const [cycleTotalLoading, setCycleTotalLoading] = useState(false);

  useEffect(() => {
    if (!room || !user) {
      setIsMyTurn(false);
      setCanStartCycle(false);
      return;
    }
    const cycleActive = !!room.activeUserId && !!room.cycleStartAt;

    setIsMyTurn(cycleActive && room.activeUserId === user.uid);

    setCanStartCycle(!room.activeUserId && !room.cycleStartAt);
  }, [room, user]);

  const fetchCycleTotal = async (room: any) => {
    if (!roomId || !room?.activeUserId || !room?.cycleStartAt) {
      setCycleTotal(0);
      return;
    }
    try {
      setCycleTotalLoading(true);

      const myQuery = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        where("cycleUserId", "==", room.activeUserId),
        where("paidBy", "==", user?.uid),
        where("createdAt", ">=", room.cycleStartAt),
      );

      const roommateQuery = query(
        collection(db, "expenses"),
        where("roomId", "==", roomId),
        where("paidBy", "==", roommateId),
        where("cycleUserId", "==", room.activeUserId),
        where("createdAt", ">=", room.cycleStartAt),
      );

      const mySnap = await getDocs(myQuery);
      const roommateSnap = await getDocs(roommateQuery);

      let myTotal = 0;
      mySnap.forEach((doc) => {
        // console.log("doc", doc.data());
        myTotal += Number(doc.data().amount || 0);
      });

      // console.log("myTotal", mySnap.size);

      let rTotal = 0;
      roommateSnap.forEach((doc) => {
        rTotal += Number(doc.data().amount || 0);
      });

      setCycleTotal(myTotal);
      setrCycleTotal(rTotal);
    } catch (error) {
      console.error("Fetch cycle total error:", error);
      setCycleTotal(0);
      setrCycleTotal(0);
    } finally {
      setCycleTotalLoading(false);
    }
  };

  useEffect(() => {
    fetchCycleTotal(room);
  }, [room]);

  const target = room?.targetAmount || 0;

  const remaining = Math.max(target - cycleTotal, 0);

  const progressPercent =
    target > 0 ? Math.min((cycleTotal / target) * 100, 100) : 0;

  const startCycle = async () => {
    if (!user || !roomId) return;

    try {
      setCycleLoading(true);
      await updateDoc(doc(db, "rooms", roomId), {
        activeUserId: user.uid,
        activeUserEmail: user.email,
        cycleStartAt: serverTimestamp(),
        cycleNumber: increment(1),
      });

      fetchRoom();
      Toast.show({
        type: "success",
        text1: "Cycle started",
        text2: "Your spending cycle has begun",
      });
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to start cycle",
      });
    } finally {
      setCycleLoading(false);
    }
  };

  const completeCycle = async () => {
    if (!roomId || !user) return;

    const nextUser =
      room.ownerId === user.uid
        ? {
            uid: room.roommateId,
            email: room.roommateEmail,
          }
        : {
            uid: room.ownerId,
            email: room.ownerEmail,
          };

    if (target > 0 && cycleTotal < target) {
      Toast.show({
        type: "error",
        text1: "Cannot complete cycle",
        text2: `You need to spend more ₹${target - cycleTotal} to complete the cycle`,
      });
      return;
    }

    try {
      setCycleLoading(true);
      console.log("data", nextUser);
      await updateDoc(doc(db, "rooms", roomId), {
        activeUserId: nextUser.uid,
        activeUserEmail: nextUser.email,
        cycleStartAt: serverTimestamp(),
        cycleNumber: increment(1),
      });
      fetchRoom();
      Toast.show({
        type: "success",
        text1: "Cycle completed",
        text2: "Turn switched successfully",
      });

      const token = roommate.notifyToken;

      sendExpensePush([token], "It is your turn to pay", "Cycle completed 🎉");
    } catch (error) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: "Failed to complete cycle",
      });
    } finally {
      setCycleLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    handleNotify();
  }, []);

  const handleNotify = async () => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // 1️⃣ Ask permission + get fresh token
      const notToken = await registerForPushNotificationsAsync();

      if (!notToken) {
        await updateDoc(userRef, {
          notifyPermission: "denied",
          updatedAt: serverTimestamp(),
        });

        Alert.alert(
          "Enable Notifications",
          "Please allow notifications to get expense updates.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Allow", onPress: () => openAppSettings() },
          ],
        );
        return;
      }

      const existingToken = userSnap.exists()
        ? userSnap.data()?.notifyToken
        : null;

      // 2️⃣ Update only if token is new or changed
      if (existingToken !== notToken) {
        await updateDoc(userRef, {
          notifyToken: notToken,
          notifyPermission: "granted",
          tokenUpdatedAt: serverTimestamp(),
        });

        console.log("Notification token updated:", notToken);
      } else {
        console.log("Notification token already up-to-date");
      }
    } catch (error) {
      console.error("handleNotify error:", error);
    }
  };

  function openAppSettings() {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  }

  async function schedulePushNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "You've got notification",
        body: "Here is the notification test body",
        data: { data: "goes here", test: { test1: "more data" } },
      },
      trigger: null,
    });
  }
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user?.photoURL && (
              <Image source={{ uri: user?.photoURL }} style={styles.avatar} />
            )}
            <Text style={styles.greeting}>
              Hello, <Text style={styles.bold}>{user?.displayName}</Text>
              👋
            </Text>
          </View>

          <TouchableOpacity onPress={schedulePushNotification}>
            <Ionicons name="notifications-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Current Status Card */}
        {!room ? (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              gap: 16,
            }}
            refreshControl={
              <RefreshControl
                onRefresh={fetchRoom}
                refreshing={loadingExpenses}
              />
            }
          >
            <Text style={{ color: "#6B7280", marginTop: 10 }}>
              No Room Found. Please create or join a room.
            </Text>
            <TouchableOpacity
              style={[
                styles.startCycleButton,
                { width: "60%", justifyContent: "center" },
              ]}
              onPress={() => router.navigate("./room")}
            >
              <Ionicons name="play-circle-outline" size={18} color="#fff" />
              <Text style={styles.cycleButtonText}>Setup Room</Text>
            </TouchableOpacity>
            {/* </View> */}
          </ScrollView>
        ) : (
          <>
            <View
              style={[
                styles.card,
                isMyTurn ? styles.myTurnCard : styles.notMyTurnCard,
              ]}
            >
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.iconCircle,
                    isMyTurn ? styles.myTurnIcon : styles.notMyTurnIcon,
                  ]}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={16}
                    color={isMyTurn ? "#22C55E" : "#EF4444"}
                  />
                </View>

                <View style={styles.textRow}>
                  {/* <Button
                    title="Press to schedule a notification"
                    onPress={async () => {
                      await schedulePushNotification();
                    }}
                  /> */}
                  <View
                    style={[
                      styles.statusDot,
                      isMyTurn ? styles.myTurnDot : styles.notMyTurnDot,
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {isMyTurn ? "Your Turn to Pay" : "Not Your Turn"}
                  </Text>
                </View>
                <TouchableOpacity onPress={fetchRoom}>
                  <Ionicons
                    name="refresh-outline"
                    size={30}
                    color={isMyTurn ? "#22C55E" : "#EF4444"}
                  />
                </TouchableOpacity>
              </View>
              <Text style={{ textAlign: "center" }}>
                Room Name: {room?.name}
              </Text>
            </View>
            {/* Budget Card */}
            <View style={styles.card}>
              {cycleTotalLoading && (
                <Text
                  style={{
                    fontSize: 11,
                    textAlign: "center",
                    marginBottom: 10,
                    color: "#9CA3AF",
                  }}
                >
                  Calculating cycle spend…
                </Text>
              )}
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetTitle}>
                  My Spent ₹{cycleTotal} / ₹{target}
                </Text>

                <Ionicons name="analytics" size={18} color="#6366F1" />
              </View>

              <Text style={styles.budgetSub}>budget tracking</Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>

              <View style={styles.progressFooter}>
                <Text style={styles.progressText}>
                  ₹{remaining} remaining this cycle
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progressPercent)}%
                </Text>
              </View>

              <Text style={{ marginTop: 10 }}>Other Spent ₹{rcycleTotal}</Text>

              {/* Cycle Actions */}
              <View style={{ marginTop: 16 }}>
                {canStartCycle && (
                  <TouchableOpacity
                    style={[
                      styles.startCycleButton,
                      cycleLoading && { opacity: 0.6 },
                    ]}
                    onPress={startCycle}
                    disabled={cycleLoading}
                  >
                    {cycleLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name="play-circle-outline"
                          size={18}
                          color="#fff"
                        />
                        <Text style={styles.cycleButtonText}>Start Cycle</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {isMyTurn && (
                  <TouchableOpacity
                    style={[
                      styles.completeCycleButton,
                      cycleLoading && { opacity: 0.6 },
                    ]}
                    onPress={completeCycle}
                    disabled={cycleLoading}
                  >
                    {cycleLoading ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#4F46E5"
                        />
                        <Text style={styles.completeCycleText}>
                          Complete Cycle
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ExpenseList
              fetchCycleTotal={fetchCycleTotal}
              loadingExpenses={loadingExpenses}
              setLoadingExpenses={setLoadingExpenses}
            />
          </>
        )}
      </>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },

  greeting: {
    fontSize: 15,
    color: "#111827",
  },

  bold: {
    fontWeight: "700",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },

  iconCircle: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionLabel: {
    fontSize: 11,
    color: "#6366F1",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    justifyContent: "space-around",
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 6,
  },

  statusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
  textRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  /* CARD */
  myTurnCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#22C55E",
  },

  notMyTurnCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },

  /* ICON */
  myTurnIcon: {
    backgroundColor: "#ECFDF5",
  },

  notMyTurnIcon: {
    backgroundColor: "#FEE2E2",
  },

  /* DOT */
  myTurnDot: {
    backgroundColor: "#22C55E",
  },

  notMyTurnDot: {
    backgroundColor: "#EF4444",
  },

  primaryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  budgetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  budgetSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginVertical: 12,
  },

  progressFill: {
    width: "75%",
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 4,
  },

  progressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressText: {
    fontSize: 11,
    color: "#6B7280",
  },

  progressPercent: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
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
