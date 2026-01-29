import React from "react";
import {
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../context/AuthContext";

const Login = () => {
  const { signInWithGoogle } = useSession();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.container}>
        {/* App Icon */}
        <View style={styles.iconWrapper}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.icon}
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>Living Expense</Text>
        <Text style={styles.subtitle}>
          The easiest way to track roommate expenses.
        </Text>

        {/* Google Button */}
        <TouchableOpacity
          style={styles.googleBtn}
          onPress={signInWithGoogle}
          activeOpacity={0.8}
        >
          <Image
            source={require("../../assets/images/login/google.png")}
            style={styles.googleIcon}
          />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>
          By continuing, you agree to our{" "}
          <Text style={styles.link}>Terms of Service</Text> &{" "}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 20,
    // backgroundColor: "#5B5FEF",
    justifyContent: "center",
    alignItems: "center",
    // marginBottom: 20,
  },
  icon: {
    width: "100%",
    height: "100%",
    // tintColor: "#fff",
  },

  title: {
    fontSize: 28,
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 30,
  },

  dots: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 50,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 4,
  },
  dotActive: {
    width: 26,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  dotText: {
    fontSize: 10,
    color: "#64748B",
  },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    width: "100%",
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  googleText: {
    fontSize: 16,
    color: "#111827",
  },

  footerText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
  },
  link: {
    color: "#5B5FEF",
  },
});
