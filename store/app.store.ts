import { auth, db } from '@/firebase/firebaseConfig';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import { create } from 'zustand';

type AppState = {
    // data
    room: any | null;
    roomId: string | null;
    roommate: any | null;
    roommateId: string | null;

    // loading states
    roomLoading: boolean;
    roommateLoading: boolean;
    globalLoading: boolean;

    // actions
    fetchRoom: () => Promise<void>;
    fetchRoommate: () => Promise<void>;
    refreshAll: () => Promise<void>;
    reset: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
    // data
    room: null,
    roomId: null,
    roommate: null,
    roommateId: null,

    // loading flags
    roomLoading: false,
    roommateLoading: false,
    globalLoading: false,

    /* 🔹 Fetch ROOM only */
    fetchRoom: async () => {
        const user = auth.currentUser;
        if (!user) return;

        set({ roomLoading: true });

        try {
            const roomSnap = await getDocs(
                query(
                    collection(db, 'rooms'),
                    where('participants', 'array-contains', user.uid),
                    where('status', '==', 'active')
                )
            );

            if (roomSnap.empty) {
                set({
                    room: null,
                    roomId: null,
                    roommate: null,
                    roommateId: null,
                    roomLoading: false,
                });
                return;
            }

            const docSnap = roomSnap.docs[0];
            const roomData = docSnap.data();

            const roommateId =
                user.uid === roomData.ownerId
                    ? roomData.roommateId
                    : roomData.ownerId;

            set({
                room: roomData,
                roomId: docSnap.id,
                roommateId,
                roomLoading: false,
            });
        } catch (e) {
            console.error('fetchRoom error:', e);
            set({ roomLoading: false });
        }
    },

    /* 🔹 Fetch ROOMMATE only */
    fetchRoommate: async () => {
        const { roommateId } = get();
        if (!roommateId) return;

        set({ roommateLoading: true });

        try {
            const snap = await getDoc(doc(db, 'users', roommateId));
            set({
                roommate: snap.exists() ? snap.data() : null,
                roommateLoading: false,
            });
        } catch (e) {
            console.error('fetchRoommate error:', e);
            set({ roommateLoading: false });
        }
    },

    /* 🔹 Refresh BOTH (global loading) */
    refreshAll: async () => {
        set({ globalLoading: true });

        await get().fetchRoom();
        await get().fetchRoommate();

        set({ globalLoading: false });
    },

    /* 🔹 Reset on logout */
    reset: () =>
        set({
            room: null,
            roomId: null,
            roommate: null,
            roommateId: null,
            roomLoading: false,
            roommateLoading: false,
            globalLoading: false,
        }),
}));
