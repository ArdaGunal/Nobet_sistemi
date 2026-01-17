/**
 * User Notification Service
 * 
 * Kişiye özel bildirimler için Firestore servisi.
 * Takas onay/red bildirimleri vb.
 */

import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { UserNotification, NotificationType } from '@/src/types';

const NOTIFICATIONS_COLLECTION = 'user_notifications';

/**
 * Yeni bir bildirim oluştur
 */
export const createNotification = async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    color: 'green' | 'red' | 'blue' = 'blue'
): Promise<void> => {
    try {
        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            userId,
            type,
            title,
            message,
            color,
            isRead: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        // Bildirim oluşturulamazsa ana işlemi durdurmayalım
    }
};

/**
 * Kullanıcının bildirimlerini dinle
 */
export const subscribeToUserNotifications = (
    userId: string,
    callback: (notifications: UserNotification[]) => void
) => {
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UserNotification[];
        callback(notifications);
    });
};

/**
 * Bildirimi okundu olarak işaretle
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    try {
        const ref = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(ref, { isRead: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('userId', '==', userId),
            where('isRead', '==', false)
        );
        const snapshot = await getDocs(q);

        const updates = snapshot.docs.map(docSnap =>
            updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docSnap.id), { isRead: true })
        );
        await Promise.all(updates);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
};

/**
 * Okunmamış bildirim sayısını al (real-time)
 */
export const subscribeToUnreadCount = (
    userId: string,
    callback: (count: number) => void
) => {
    const q = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
        callback(snapshot.size);
    });
};
