import { useAuthStore } from "@/store/auth.store";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useEffect } from "react";
import SessionProvider, { useSession } from "./context/AuthContext";
import SplashScreenController from "./splash";
WebBrowser.maybeCompleteAuthSession();



export default function RootLayout() {

  return (
    <SessionProvider>
      <SplashScreenController />
      <RootNavigator />
    </SessionProvider >);
}


function RootNavigator() {
  const { validateUser, isLoading } = useSession();
  const { checkAuth, isLoggedIn } = useAuthStore();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "392314115970-djvi39n0i943outoi8ljstfj44loassi.apps.googleusercontent.com",
      iosClientId:
        "392314115970-lf8j4v6imlfhubv9o5gqn9jb9js3dh0u.apps.googleusercontent.com",
      profileImageSize: 500,
    });
    validateUser();

  }, []);

  // console.log('isLoading', isLoading)
  // console.log('isLoggedIn', isLoggedIn)

  if (isLoading) {
    return null; // splash still visible
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="(auth)" ></Stack.Screen>
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>);
}