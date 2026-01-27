import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const createUser = async (user: any, notToken: string) => {
    try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const existingData = userSnap.data();
            if (!existingData.notifyToken && existingData.notifyToken !== notToken && notToken) {
                await updateDoc(userRef, {
                    notifyToken: notToken,
                    updatedAt: serverTimestamp(),
                });
            }

            return {
                created: false,
                userId: user.uid,
                data: existingData,
            };
        }

        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photo: user.photoURL,
            notifyToken: notToken,
            provider: user.providerData[0]?.providerId,
            createdAt: serverTimestamp(),
        });

        return {
            created: true,
            userId: user.uid,
        };
    } catch (error: any) {
        console.error('createUser error:', error);

        return {
            created: false,
            error: error?.message || 'Failed to create user',
        };
    }
}