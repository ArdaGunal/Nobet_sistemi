/**
 * Request Service
 * 
 * Handles employee shift requests (swap, leave, preference)
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
import { ShiftRequest, RequestType, RequestStatus, StaffRole, ShiftSlot } from '@/src/types';

const REQUESTS_COLLECTION = 'shiftRequests';

/**
 * Create a new shift request
 */
export const createRequest = async (
    userId: string,
    userName: string,
    userStaffRole: StaffRole,
    type: RequestType,
    requestedDate: string,
    message: string,
    action?: 'add' | 'remove',
    shiftSlot?: ShiftSlot,
    targetDate?: string,
    targetUserId?: string,
    targetUserName?: string
): Promise<ShiftRequest> => {
    try {
        const now = new Date().toISOString();
        const requestData: any = {
            userId,
            userName,
            userStaffRole,
            type,
            requestedDate,
            message,
            status: 'pending' as RequestStatus,
            createdAt: now,
        };

        // Only add optional fields if they have values
        if (action) requestData.action = action;
        if (shiftSlot) requestData.shiftSlot = shiftSlot;
        if (targetDate) requestData.targetDate = targetDate;
        if (targetUserId) requestData.targetUserId = targetUserId;
        if (targetUserName) requestData.targetUserName = targetUserName;

        const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), requestData);

        return {
            id: docRef.id,
            ...requestData,
        };
    } catch (error: any) {
        console.error('Error creating request:', error);
        throw new Error(error?.message || 'İstek oluşturulamadı');
    }
};

/**
 * Update request status (admin only)
 */
export const updateRequestStatus = async (
    requestId: string,
    status: RequestStatus,
    adminResponse?: string
): Promise<void> => {
    try {
        const requestRef = doc(db, REQUESTS_COLLECTION, requestId);
        await updateDoc(requestRef, {
            status,
            adminResponse: adminResponse || null,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error updating request:', error);
        throw new Error('İstek güncellenemedi');
    }
};

/**
 * Delete a request
 */
export const deleteRequest = async (requestId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, REQUESTS_COLLECTION, requestId));
    } catch (error) {
        console.error('Error deleting request:', error);
        throw new Error('İstek silinemedi');
    }
};

/**
 * Get all pending requests (for admin)
 */
export const getPendingRequests = async (): Promise<ShiftRequest[]> => {
    try {
        const q = query(
            collection(db, REQUESTS_COLLECTION),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShiftRequest[];
    } catch (error) {
        console.error('Error fetching requests:', error);
        throw new Error('İstekler yüklenemedi');
    }
};

/**
 * Get requests by user
 */
export const getRequestsByUser = async (userId: string): Promise<ShiftRequest[]> => {
    try {
        const q = query(
            collection(db, REQUESTS_COLLECTION),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShiftRequest[];
    } catch (error) {
        console.error('Error fetching user requests:', error);
        throw new Error('İstekler yüklenemedi');
    }
};

/**
 * Subscribe to pending requests (real-time)
 */
export const subscribeToPendingRequests = (
    callback: (requests: ShiftRequest[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ShiftRequest[];
            callback(requests);
        },
        (error) => {
            console.error('Request subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};

/**
 * Subscribe to user's requests (real-time)
 */
export const subscribeToUserRequests = (
    userId: string,
    callback: (requests: ShiftRequest[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const requests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ShiftRequest[];
            callback(requests);
        },
        (error) => {
            console.error('Request subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};
