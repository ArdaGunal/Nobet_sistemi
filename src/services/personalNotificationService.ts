/**
 * Personal Notification Service
 * Uses user subcollections for guaranteed isolation:
 * users/{userId}/personalNotifications/{notificationId}
 */

import { db } from '../../config/firebase.config';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    getDocs,
    writeBatch
} from 'firebase/firestore';

export interface PersonalNotification {
    id: string;
    title: string;
    content: string;
    type: 'swap_approved' | 'swap_rejected' | 'system';
    color: 'green' | 'red' | 'blue';
    isRead: boolean;
    createdAt: string;
}

/**
 * Create a personal notification for a specific user
 */
export const createPersonalNotification = async (
    targetUserId: string,
    title: string,
    content: string,
    type: 'swap_approved' | 'swap_rejected' | 'system',
    color: 'green' | 'red' | 'blue' = 'blue'
): Promise<void> => {
    try {
        const notificationsRef = collection(db, 'users', targetUserId, 'personalNotifications');
        await addDoc(notificationsRef, {
            title,
            content,
            type,
            color,
            isRead: false,
            createdAt: new Date().toISOString()
        });
        console.log('Personal notification created for user:', targetUserId);
    } catch (error) {
        console.error('Error creating personal notification:', error);
        // Don't throw - notification failure shouldn't break main operation
    }
};

/**
 * Subscribe to a user's personal notifications
 */
export const subscribeToPersonalNotifications = (
    userId: string,
    onUpdate: (notifications: PersonalNotification[]) => void
) => {
    const notificationsRef = collection(db, 'users', userId, 'personalNotifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as PersonalNotification[];
        onUpdate(notifications);
    }, (error) => {
        console.error('Error subscribing to personal notifications:', error);
        onUpdate([]);
    });
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
    try {
        const notificationRef = doc(db, 'users', userId, 'personalNotifications', notificationId);
        await updateDoc(notificationRef, { isRead: true });
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    try {
        const notificationsRef = collection(db, 'users', userId, 'personalNotifications');
        const snapshot = await getDocs(notificationsRef);

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
            if (!doc.data().isRead) {
                batch.update(doc.ref, { isRead: true });
            }
        });
        await batch.commit();
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = (notifications: PersonalNotification[]): number => {
    return notifications.filter(n => !n.isRead).length;
};
