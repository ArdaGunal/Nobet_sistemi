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
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    serverTimestamp,
    deleteDoc,
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
 * Bildirimi manuel olarak sil
 */
export const deletePersonalNotification = async (userId: string, notificationId: string) => {
    const notifRef = doc(db, 'users', userId, 'personalNotifications', notificationId);
    await deleteDoc(notifRef);
};

/**
 * Süresi dolmuş (7 günden eski) takas bildirimlerini temizle
 * NOT: Bu fonksiyon client-side'da çağrılacağı için sadece o anki aktif kullanıcı için çalışır.
 * İdealde Cloud Function olmalıydı.
 */
export const cleanupExpiredNotifications = async (userId: string) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const cutoffDate = oneWeekAgo.toISOString();

        // Takas ile ilgili tipler
        const swapTypes = ['swap_request', 'swap_approved', 'swap_rejected'];

        // Firestore'da 'in' sorgusu limitlidir, bu yüzden basitçe tarih sorgusu yapıp memory'de filtreleyebiliriz
        // veya query'i buna göre düzenleyebiliriz.
        // Tarihi eski olanları çek
        const q = query(
            collection(db, 'users', userId, 'personalNotifications'),
            where('createdAt', '<', cutoffDate)
        );

        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            // Sadece takas ile ilgili olanları sil
            if (data.type && swapTypes.includes(data.type)) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`${count} adet süresi dolmuş bildirim temizlendi.`);
        }
    } catch (error) {
        console.error('Bildirim temizleme hatası:', error);
    }
};

/**
 * Kullanıcının TÜM kişisel bildirimlerini sil
 */
export const deleteAllPersonalNotifications = async (userId: string) => {
    try {
        const q = query(collection(db, 'users', userId, 'personalNotifications'));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`${count} bildirim silindi.`);
        }
        return count;
    } catch (error) {
        console.error('Toplu silme hatası:', error);
        throw error;
    }
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
