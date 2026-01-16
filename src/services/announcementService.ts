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
    arrayUnion
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
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Announcement[];
        onUpdate(announcements);
    });
};
