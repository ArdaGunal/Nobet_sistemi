import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    where,
    arrayUnion,
    limit,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import { Announcement } from '@/src/types';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

/**
 * Create a new announcement
 */
export const createAnnouncement = async (
    title: string,
    content: string,
    createdBy: string,
    creatorName: string,
    priority: 'normal' | 'urgent' = 'normal'
): Promise<void> => {
    try {
        await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
            title,
            content,
            createdBy,
            creatorName,
            priority,
            isActive: true,
            readBy: [],
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        throw new Error('Duyuru oluşturulamadı');
    }
};

/**
 * Create a personal notification (shown in announcements for specific user)
 */
export const createPersonalNotification = async (
    targetUserId: string,
    title: string,
    content: string,
    notificationType: 'swap_approved' | 'swap_rejected' | 'system',
    notificationColor: 'green' | 'red' | 'blue' = 'blue'
): Promise<void> => {
    try {
        await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
            title,
            content,
            createdBy: 'system',
            creatorName: 'Sistem',
            priority: 'normal',
            isActive: true,
            readBy: [],
            targetUserId,
            notificationType,
            notificationColor,
            createdAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error creating personal notification:', error);
        // Bildirim oluşturulamazsa ana işlemi durdurmayalım
    }
};

/**
 * Mark announcement as read by user
 */
export const markAnnouncementAsRead = async (announcementId: string, userId: string): Promise<void> => {
    try {
        const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, announcementId);
        await updateDoc(docRef, {
            readBy: arrayUnion(userId)
        });
    } catch (error) {
        console.error('Error marking announcement as read:', error);
        throw new Error('İşlem başarısız');
    }
};

/**
 * Delete an announcement
 */
export const deleteAnnouncement = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
    } catch (error) {
        console.error('Error deleting announcement:', error);
        throw new Error('Duyuru silinemedi');
    }
};

/**
 * Subscribe to active announcements
 */
export const subscribeToAnnouncements = (
    onUpdate: (announcements: Announcement[]) => void
) => {
    const q = query(
        collection(db, ANNOUNCEMENTS_COLLECTION),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Announcement[];
        onUpdate(announcements);
    });
};

/**
 * Cleanup announcements older than 30 days
 */
export const cleanupOldAnnouncements = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        const q = query(
            collection(db, ANNOUNCEMENTS_COLLECTION),
            where('createdAt', '<', cutoffDate)
        );

        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Cleanup: ${count} old announcements deleted.`);
        }
        return count;
    } catch (error) {
        console.error('Announcement cleanup failed:', error);
        return 0;
    }
};
