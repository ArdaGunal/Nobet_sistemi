
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase.config';

const SYSTEM_COLLECTION = 'system';
const METADATA_DOC = 'metadata';

/**
 * Checks if system maintenance is needed (e.g., every 30 days)
 */
export const checkMaintenanceNeeded = async (): Promise<boolean> => {
    try {
        const docRef = doc(db, SYSTEM_COLLECTION, METADATA_DOC);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return true; // Never run before
        }

        const data = docSnap.data();
        if (!data.lastMaintenanceDate) {
            return true;
        }

        const lastRun = new Date(data.lastMaintenanceDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastRun.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 30; // Run if older than 30 days
    } catch (error) {
        console.error('Error checking maintenance status:', error);
        return false; // Fail safe
    }
};

/**
 * Updates the last maintenance date to now
 */
export const updateLastMaintenanceDate = async () => {
    try {
        const docRef = doc(db, SYSTEM_COLLECTION, METADATA_DOC);
        await setDoc(docRef, {
            lastMaintenanceDate: new Date().toISOString(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating maintenance date:', error);
    }
};
