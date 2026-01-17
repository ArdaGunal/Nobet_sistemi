import {
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    getDoc,
    where,
    increment,
    deleteDoc,
    getDocs,
    writeBatch,
    limit,
    collectionGroup
} from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { ChatMessage, ChatRoom, User, UserRole } from '../types';

export const CHATS_COLLECTION = 'chats';
export const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Send a message to a chat room
 * Creates the chat room if it doesn't exist
 */
export const sendMessage = async (
    sender: User,
    receiverId: string, // Admin sends to UserID, User sends to Admin (which is their own UserID as room ID)
    text: string
): Promise<void> => {
    // The chat room ID is always the User's ID (not the Admin's ID)
    // If sender is user, roomId = sender.id
    // If sender is admin, roomId = receiverId
    const isSenderAdmin = sender.role === 'admin' || sender.role === 'super_admin';
    const roomId = isSenderAdmin ? receiverId : sender.id;

    if (!text.trim()) return;

    try {
        const now = new Date().toISOString();
        const chatRef = doc(db, CHATS_COLLECTION, roomId);

        // 1. Add message to subcollection
        await addDoc(collection(chatRef, MESSAGES_SUBCOLLECTION), {
            text,
            senderId: sender.id,
            senderName: sender.fullName,
            senderRole: sender.role, // Add sender role
            createdAt: now,
            isRead: false
        });

        // 2. Update or Create Chat Room Metadata
        // Determine who has unread messages
        const unreadUpdate = isSenderAdmin
            ? { unreadCountUser: increment(1) }
            : { unreadCountAdmin: increment(1) };

        const roomUpdateData: any = {
            lastMessage: text,
            lastMessageTime: now,
            updatedAt: now,
            ...unreadUpdate
        };

        // Ensure user details are set if the sender is the user (to fix "Unknown" issue)
        if (!isSenderAdmin) {
            roomUpdateData.userName = sender.fullName;
            roomUpdateData.userRole = sender.role;
            roomUpdateData.userEmail = sender.email;
        }

        // Check if room exists first to allow atomic update or create with merge
        // We use setDoc with merge to handle cases where room might not exist or lacks fields
        await setDoc(chatRef, {
            id: roomId,
            userId: roomId, // Room ID is always the User ID
            ...roomUpdateData
        }, { merge: true });

    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

/**
 * Subscribe to messages in a specific chat room
 */
export const subscribeToMessages = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
    const q = query(
        collection(db, CHATS_COLLECTION, roomId, MESSAGES_SUBCOLLECTION),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    return onSnapshot(q, (snapshot) => {
        const messages: ChatMessage[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                text: data.text,
                senderId: data.senderId,
                senderName: data.senderName,
                senderRole: data.senderRole,
                createdAt: data.createdAt,
                isRead: data.isRead
            });
        });
        callback(messages);
    });
};

/**
 * Subscribe to all chat rooms (For Admin)
 * Ordered by last message time
 */
export const subscribeToChatRooms = (callback: (rooms: ChatRoom[]) => void) => {
    const q = query(
        collection(db, CHATS_COLLECTION),
        orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const rooms: ChatRoom[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            rooms.push({
                id: doc.id,
                userId: data.userId,
                userName: data.userName || 'Bilinmeyen Kullanıcı',
                userEmail: data.userEmail,
                userRole: data.userRole || 'user',
                lastMessage: data.lastMessage,
                lastMessageTime: data.lastMessageTime,
                unreadCountAdmin: data.unreadCountAdmin || 0,
                unreadCountUser: data.unreadCountUser || 0,
                updatedAt: data.updatedAt
            });
        });
        callback(rooms);
    });
};

/**
 * Subscribe to unread count
 * For Admin: Sum of unreadCountAdmin across all rooms
 * For User: unreadCountUser from their specific room
 */
export const subscribeToUnreadCount = (userId: string, userRole: UserRole, callback: (count: number) => void) => {
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    if (isAdmin) {
        // Admin: listen to all rooms and sum unreadCountAdmin
        const q = query(collection(db, CHATS_COLLECTION));
        return onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                totalUnread += (data.unreadCountAdmin || 0);
            });
            callback(totalUnread);
        });
    } else {
        // User: listen to their own room document
        const docRef = doc(db, CHATS_COLLECTION, userId);
        return onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                callback(data.unreadCountUser || 0);
            } else {
                callback(0);
            }
        });
    }
};

/**
 * Mark messages as read when entering a chat
 */
export const markChatAsRead = async (roomId: string, userRole: UserRole) => {
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const chatRef = doc(db, CHATS_COLLECTION, roomId);

    try {
        // Reset the counter for the viewer
        const updateData = isAdmin
            ? { unreadCountAdmin: 0 }
            : { unreadCountUser: 0 };

        await updateDoc(chatRef, updateData);
    } catch (error) {
        // console.error('Error marking as read:', error);
    }
};

/**
 * Update User Name in Chat (if user changes profile)
 */
export const updateChatUserInfo = async (userId: string, newName: string) => {
    try {
        const chatRef = doc(db, CHATS_COLLECTION, userId);
        const docSnap = await getDoc(chatRef);

        if (docSnap.exists()) {
            await updateDoc(chatRef, { userName: newName });
        }
    } catch (error) {
        console.error('Error updating chat user info:', error);
    }
};

/**
 * Delete a chat room and all its messages
 * (Admin function)
 */
export const deleteChatRoom = async (roomId: string): Promise<void> => {
    try {
        // 1. Delete all messages first
        const messagesQuery = query(collection(db, CHATS_COLLECTION, roomId, MESSAGES_SUBCOLLECTION));
        const snapshot = await getDocs(messagesQuery);

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

    } catch (error) {
        console.error('Error deleting chat room:', error);
        throw error;
    }
};

/**
 * Cleanup messages older than 30 days from ALL chat rooms.
 */
export const cleanupOldMessages = async () => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffDate = thirtyDaysAgo.toISOString();

        // Use collectionGroup to find all messages across all rooms
        const q = query(
            collectionGroup(db, MESSAGES_SUBCOLLECTION),
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
            console.log(`Cleanup: ${count} old messages deleted.`);
        }
        return count;
    } catch (error) {
        console.error('Message cleanup failed:', error);
        return 0;
    }
};
