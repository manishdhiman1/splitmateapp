import { useAuthStore } from "@/store/auth.store";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from "firebase/auth";

import { auth } from "@/firebase/firebaseConfig";
import { createUser } from "@/firebase/services/user.service";
import {
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useState,
} from "react";
import Toast from "react-native-toast-message";
const AuthContext = createContext<{
  signInWithGoogle: () => void;
  signOut: () => void;
  session?: string | null;
  isLoading: boolean;
}>({
  signInWithGoogle: () => null,
  signOut: () => null,
  session: null,
  isLoading: false,
});

import registerForPushNotificationsAsync from "@/utils/registerForPush";
import * as Notifications from "expo-notifications";

export function useSession() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error("useSession must be wrapped in a <SessionProvider />");
  }
  return value;
}

export default function SessionProvider({ children }: PropsWithChildren) {
  const [loading, setloading] = useState(true);

  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "760399815016-pvion1p1redgn5904m2n4uejsdlb3qj2.apps.googleusercontent.com",
      profileImageSize: 500,
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        useAuthStore.getState().setUser(user);
      } else {
        useAuthStore.getState().setUser(null);
      }
      setloading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data.idToken ?? "";

        const credential = GoogleAuthProvider.credential(response.data.idToken);

        const userCredential = await signInWithCredential(auth, credential);

        const notToken = await registerForPushNotificationsAsync();

        await createUser(userCredential.user, notToken ?? "");
      } else {
        Toast.show({
          type: "info",
          text1: "Login cancelled",
          text2: "Google sign-in was cancelled",
          position: "bottom",
        });
        console.log("cancel");
      }
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.IN_PROGRESS:
            Toast.show({
              type: "info",
              text1: "Please wait",
              text2: "Sign-in already in progress",
              position: "bottom",
            });
            break;

          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Toast.show({
              type: "error",
              text1: "Google Services Error",
              text2: "Google Play Services not available",
              position: "bottom",
            });
            break;

          default:
            console.log("erorr", statusCodes);
            Toast.show({
              type: "error",
              text1: "Login failed",
              text2: "Something went wrong",
              position: "bottom",
            });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Unexpected error",
          text2: "Please try again later",
          position: "bottom",
        });
        console.log(error);
      }
    }
  };

  const signOutGoogle = async () => {
    try {
      await GoogleSignin.signOut();
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        signInWithGoogle: signInWithGoogle,
        signOut: signOutGoogle,
        isLoading: loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
