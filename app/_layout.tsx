import { useAuthStore } from "@/store/auth.store";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import SessionProvider, { useSession } from "./context/AuthContext";
import SplashScreenController from "./splash";
WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  // Notifications.setNotificationHandler({
  //   handleNotification: async () => ({
  //     shouldShowAlert: true,
  //     shouldPlaySound: true,
  //     shouldSetBadge: false,
  //   }),
  // });

  return (
    <SessionProvider>
      <SplashScreenController />
      <RootNavigator />
      <Toast />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { isLoading } = useSession();
  const { isLoggedIn } = useAuthStore();

  if (isLoading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)"></Stack.Screen>
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
