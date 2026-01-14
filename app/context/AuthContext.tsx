import { useAuthStore } from "@/store/auth.store";
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { createContext, PropsWithChildren, use, useState } from "react";
import Toast from 'react-native-toast-message';
const AuthContext = createContext<{
    // signIn: () => void;
    signInWithGoogle: () => void;
    signOut: () => void;
    validateUser: () => void;
    session?: string | null;
    isLoading: boolean;
}>({
    // signIn: () => null,
    signInWithGoogle: () => null,
    signOut: () => null,
    validateUser: () => null,
    session: null,
    isLoading: false,
});


export function useSession() {
    const value = use(AuthContext);
    if (!value) {
        throw new Error('useSession must be wrapped in a <SessionProvider />');
    }
    return value;
}



export default function SessionProvider({ children }: PropsWithChildren) {
    const [loading, setloading] = useState(false)


    const { login, logout, token, data, checkAuth } = useAuthStore();

    const signInWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            if (isSuccessResponse(response)) {
                const idToken = response.data.idToken;

                console.log('coming', process.env.EXPO_PUBLIC_BASE_API_URL)
                const res = await fetch(process.env.EXPO_PUBLIC_BASE_API_URL + "/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                });

                let result = await res.json();
                if (!res.ok) {
                    throw new Error(result.message || "Login failed");
                }
                await login(result.token, result.user);
            } else {
                Toast.show({
                    type: 'info',
                    text1: 'Login cancelled',
                    text2: 'Google sign-in was cancelled',
                    position: 'bottom',
                });
                console.log('cancel')
            }
        } catch (error) {
            if (isErrorWithCode(error)) {
                switch (error.code) {
                    case statusCodes.IN_PROGRESS:
                        Toast.show({
                            type: 'info',
                            text1: 'Please wait',
                            text2: 'Sign-in already in progress',
                            position: 'bottom',
                        });
                        break;

                    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                        Toast.show({
                            type: 'error',
                            text1: 'Google Services Error',
                            text2: 'Google Play Services not available',
                            position: 'bottom',
                        });
                        break;

                    default:
                        Toast.show({
                            type: 'error',
                            text1: 'Login failed',
                            text2: 'Something went wrong',
                            position: 'bottom',
                        });
                        console.log(error);
                }
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Unexpected error',
                    text2: 'Please try again later',
                    position: 'bottom',
                });
                console.log(error);
            }
        }

    }

    const signOutGoogle = async () => {
        try {
            await GoogleSignin.signOut();
            await logout();
        } catch (error) {
            console.error(error);
        }
    }

    const validateUser = async () => {
        setloading(true);
        const authData: any = await checkAuth();
        // return;
        try {
            const res = await fetch(
                `${process.env.EXPO_PUBLIC_BASE_API_URL}/me`,
                {
                    headers: {
                        Authorization: `Bearer ${authData.token}`,
                    },
                }
            );
            if (!res.ok) {
                await logout();
                throw new Error("Unauthorized");
            }

            const serverUser = await res.json();
            if (serverUser._id !== authData.data._id) {
                console.warn("User mismatch detected");
                await logout();
            }
            return serverUser;

        } catch (error) {
            console.warn("User has error", error);
            await logout();
            // throw new Error("User mismatch");
        } finally {
            setloading(false);
        }
    }

    return <AuthContext.Provider
        value={{
            // signIn: login,
            signInWithGoogle: signInWithGoogle,
            validateUser: validateUser,
            signOut: signOutGoogle,
            session: token,
            isLoading: loading,
        }}>
        {children}
    </ AuthContext.Provider>
}