import * as SecureStorage from 'expo-secure-store';
import { create } from 'zustand';

type AuthData = {
    isLoggedIn: boolean;
    token: string | null;
    data: any;
};
type AuthState = {
    isLoggedIn: boolean,
    token: string,
    data: any,
    login: (token: string, data: any) => Promise<void>,
    logout: () => Promise<void>,
    checkAuth: () => Promise<AuthData>;
}

export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    token: '',
    data: {},
    login: async (token, data) => {
        await SecureStorage.setItemAsync("login", "true");
        await SecureStorage.setItemAsync("token", token);
        await SecureStorage.setItemAsync("data", JSON.stringify(data));
        set({ isLoggedIn: true, token: token, data: data });
    },
    logout: async () => {
        await SecureStorage.deleteItemAsync("login");
        await SecureStorage.deleteItemAsync("token");
        await SecureStorage.deleteItemAsync("data");

        set({
            isLoggedIn: false,
            token: "",
            data: null,
        });
    },
    checkAuth: async () => {
        const login = await SecureStorage.getItemAsync("login");
        const token = await SecureStorage.getItemAsync("token");
        const data = await SecureStorage.getItemAsync("data");
        // console.log('token', token)
        if (login === "true" && token) {
            set({
                isLoggedIn: true,
                token,
                data: data ? JSON.parse(data) : null,
            });
        } else {
            set({ isLoggedIn: false });
        }
        return {
            isLoggedIn: true,
            token,
            data: data ? JSON.parse(data) : null,
        };
    },
}))