/**
 * Shift Service
 * 
 * Handles all Firestore operations for shift documents.
 * Provides CRUD operations and real-time listeners for shifts.
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { Shift, ShiftSlot } from '@/src/types';

// Collection reference
const SHIFTS_COLLECTION = 'shifts';

/**
* Get all shifts
*/
export const getAllShifts = async (): Promise<Shift[]> => {
    try {
        const shiftsRef = collection(db, SHIFTS_COLLECTION);
        const q = query(shiftsRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Shift[];
    } catch (error) {
        console.error('Error fetching shifts:', error);
        throw new Error('Nöbetler yüklenemedi');
    }
};

/**
* Get shifts by date
*/
export const getShiftsByDate = async (date: string): Promise<Shift[]> => {
    try {
        const shiftsRef = collection(db, SHIFTS_COLLECTION);
        const q = query(shiftsRef, where('date', '==', date));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Shift[];
    } catch (error) {
        console.error('Error fetching shifts by date:', error);
        throw new Error('Nöbetler yüklenemedi');
    }
};

/**
* Get shifts for a date range
*/
export const getShiftsByDateRange = async (startDate: string, endDate: string): Promise<Shift[]> => {
    try {
        const shiftsRef = collection(db, SHIFTS_COLLECTION);
        const q = query(
            shiftsRef,
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Shift[];
    } catch (error) {
        console.error('Error fetching shifts by date range:', error);
        throw new Error('Nöbetler yüklenemedi');
    }
};

/**
* Get shifts for a specific user
*/
export const getShiftsByUser = async (userId: string): Promise<Shift[]> => {
    try {
        const shiftsRef = collection(db, SHIFTS_COLLECTION);
        const q = query(shiftsRef, where('userId', '==', userId), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Shift[];
    } catch (error) {
        console.error('Error fetching user shifts:', error);
        throw new Error('Kullanıcı nöbetleri yüklenemedi');
    }
};

/**
* Create a new shift
*/
export const createShift = async (
    date: string,
    shiftSlot: ShiftSlot,
    userId: string,
    userName: string
): Promise<Shift> => {
    try {
        // Check if shift already exists for this date and slot
        const shiftsRef = collection(db, SHIFTS_COLLECTION);
        const existingQuery = query(
            shiftsRef,
            where('date', '==', date),
            where('shiftSlot', '==', shiftSlot)
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
            throw new Error('Bu tarih ve vardiya için zaten bir nöbet mevcut');
        }

        const now = new Date().toISOString();
        const docRef = await addDoc(shiftsRef, {
            date,
            shiftSlot,
            userId,
            userName,
            createdAt: now,
            updatedAt: now,
        });

        return {
            id: docRef.id,
            date,
            shiftSlot,
            userId,
            userName,
            createdAt: now,
            updatedAt: now,
        };
    } catch (error: any) {
        console.error('Error creating shift:', error);
        throw new Error(error.message || 'Nöbet oluşturulamadı');
    }
};

/**
* Update an existing shift
*/
export const updateShift = async (
    shiftId: string,
    updates: Partial<Omit<Shift, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
        await updateDoc(shiftRef, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error updating shift:', error);
        throw new Error('Nöbet güncellenemedi');
    }
};

/**
* Delete a shift
*/
export const deleteShift = async (shiftId: string): Promise<void> => {
    try {
        const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
        await deleteDoc(shiftRef);
    } catch (error) {
        console.error('Error deleting shift:', error);
        throw new Error('Nöbet silinemedi');
    }
};

/**
* Subscribe to shifts for real-time updates
*/
export const subscribeToShifts = (
    callback: (shifts: Shift[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const shiftsRef = collection(db, SHIFTS_COLLECTION);
    const q = query(shiftsRef, orderBy('date', 'desc'));

    return onSnapshot(
        q,
        (snapshot) => {
            const shifts = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Shift[];
            callback(shifts);
        },
        (error) => {
            console.error('Shift subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};

/**
* Subscribe to shifts for a specific date (real-time)
*/
export const subscribeToShiftsByDate = (
    date: string,
    callback: (shifts: Shift[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const shiftsRef = collection(db, SHIFTS_COLLECTION);
    const q = query(shiftsRef, where('date', '==', date));

    return onSnapshot(
        q,
        (snapshot) => {
            const shifts = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Shift[];
            callback(shifts);
        },
        (error) => {
            console.error('Shift subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};
