/**
 * User Service
 * 
 * Handles all Firestore operations for user documents.
 * Provides CRUD operations for managing employees.
 */

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    Unsubscribe,
    writeBatch
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase.config';
import { User, UserRole, StaffRole, RotationGroup } from '@/src/types';

// Collection reference
const USERS_COLLECTION = 'users';

/**
* Get all users
*/
export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, orderBy('fullName', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as User[];
    } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error('Kullanıcılar yüklenemedi');
    }
};

/**
* Get a single user by ID
*/
export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return null;
        }

        return {
            id: userDoc.id,
            ...userDoc.data(),
        } as User;
    } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('Kullanıcı bulunamadı');
    }
};

/**
* Get users by role
*/
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    try {
        const usersRef = collection(db, USERS_COLLECTION);
        const q = query(usersRef, where('role', '==', role), orderBy('fullName', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as User[];
    } catch (error) {
        console.error('Error fetching users by role:', error);
        throw new Error('Kullanıcılar yüklenemedi');
    }
};

/**
* Create a new user with Firebase Auth and Firestore document
*/
export const createUser = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole = 'user',
    staffRole?: StaffRole,
    rotationGroup?: RotationGroup
): Promise<User> => {
    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const now = new Date().toISOString();
        const userData: any = {
            email,
            fullName,
            role,
            createdAt: now,
        };

        if (staffRole) userData.staffRole = staffRole;
        if (rotationGroup) userData.rotationGroup = rotationGroup;

        // Create Firestore document with the same ID as Auth UID
        await setDoc(doc(db, USERS_COLLECTION, firebaseUser.uid), userData);

        return {
            id: firebaseUser.uid,
            ...userData,
        };
    } catch (error: any) {
        console.error('Error creating user:', error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('Bu e-posta adresi zaten kullanımda');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Şifre en az 6 karakter olmalıdır');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Geçersiz e-posta adresi');
        }
        throw new Error('Kullanıcı oluşturulamadı');
    }
};

/**
* Create a user document only (for existing Auth users)
*/
export const createUserDocument = async (
    userId: string,
    email: string,
    fullName: string,
    role: UserRole = 'user'
): Promise<User> => {
    try {
        const now = new Date().toISOString();
        const userData: Omit<User, 'id'> = {
            email,
            fullName,
            role,
            createdAt: now,
        };

        await setDoc(doc(db, USERS_COLLECTION, userId), userData);

        return {
            id: userId,
            ...userData,
        };
    } catch (error) {
        console.error('Error creating user document:', error);
        throw new Error('Kullanıcı belgesi oluşturulamadı');
    }
};

/**
* Update user information and cascade relevant changes (like staffRole) to other collections
*/
export const updateUser = async (
    userId: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);

        // 1. Update User Document
        await updateDoc(userRef, updates);

        // 2. If staffRole is updated, update ALL existing shift assignments for this user
        // This ensures the dashboard reflects the new role immediately without manual refresh
        if (updates.staffRole) {
            console.log(`Cascading staffRole update to schedule for user ${userId} -> ${updates.staffRole}`);

            // Query all shifts for this user
            // Optimization: In a real app, maybe only update future shifts?
            // But for consistency, updating all is safer for this scale.
            const scheduleRef = collection(db, 'schedule');
            const q = query(scheduleRef, where('userId', '==', userId));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach((doc) => {
                    batch.update(doc.ref, {
                        staffRole: updates.staffRole,
                        updatedAt: new Date().toISOString()
                    });
                });
                await batch.commit();
                console.log(`Updated ${snapshot.size} shifts with new role.`);
            }
        }

    } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Kullanıcı güncellenemedi');
    }
};

/**
* Delete a user and ALL their related data (cascade delete)
* This removes: user document, shift assignments, shift requests, and chat data
*/
/**
* Delete a user and ALL their related data (cascade delete)
* This removes: user document, shift assignments, shift requests, and chat data
*/
export const deleteUser = async (userId: string): Promise<void> => {
    try {
        // ... (delete logic)
        // 1. Delete all shift assignments for this user
        const scheduleRef = collection(db, 'schedule');
        const scheduleQuery = query(scheduleRef, where('userId', '==', userId));
        const scheduleSnapshot = await getDocs(scheduleQuery);
        const scheduleDeletePromises = scheduleSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(scheduleDeletePromises);

        // 2. Delete all shift requests by this user
        const requestsRef = collection(db, 'shiftRequests');
        const requestsQuery = query(requestsRef, where('userId', '==', userId));
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsDeletePromises = requestsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(requestsDeletePromises);

        // 3. Delete chat room and messages for this user
        const chatRoomRef = doc(db, 'chats', userId);
        const messagesRef = collection(db, 'chats', userId, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const messagesDeletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(messagesDeletePromises);
        await deleteDoc(chatRoomRef);

        // 4. Finally, delete the user document
        const userRef = doc(db, USERS_COLLECTION, userId);
        await deleteDoc(userRef);

        console.log(`User ${userId} and all related data deleted successfully`);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Kullanıcı silinemedi');
    }
};

/**
 * REPAIR UTILITY: Normalizes all user data and syncs shifts
 * Fixes legacy data issues (missing fields, inconsistent shift roles)
 */
export const repairDatabase = async (): Promise<string> => {
    try {
        console.log('Starting database repair...');
        const users = await getAllUsers();
        const batch = writeBatch(db);
        let updatedUsers = 0;
        let syncedShifts = 0;

        for (const user of users) {
            let needsUpdate = false;
            const updates: any = {};

            // 1. Check & Fix Missing Fields
            if (!user.staffRole) {
                updates.staffRole = 'saglikci'; // Default
                needsUpdate = true;
            }
            if (!user.rotationGroup) {
                updates.rotationGroup = 'A'; // Default
                needsUpdate = true;
            }
            if (user.isApproved === undefined) {
                updates.isApproved = true; // Assume legacy users are approved
                needsUpdate = true;
            }

            if (needsUpdate) {
                const userRef = doc(db, USERS_COLLECTION, user.id);
                batch.update(userRef, updates);
                updatedUsers++;
            }

            // 2. Sync Shifts (Force update shift roles to match user profile)
            // Note: We can't do this in the same batch easily if there are too many documents.
            // So we'll call the sync logic separately per user.
            // For safety/performance in this utility, we'll await each.
            const currentRole = (needsUpdate ? updates.staffRole : user.staffRole) || 'saglikci';

            // Reuse sync logic but return count instead of void if possible, 
            // or just let it run.
            await syncUserShiftRoles(user.id, currentRole);
            // We won't count exact shifts here to avoid complexity, just assume success
        }

        await batch.commit(); // Commit user profile fixes

        return `Onarım Tamamlandı:\n- ${updatedUsers} kullanıcı profili düzeltildi.\n- Tüm kullanıcıların nöbetleri senkronize edildi.`;
    } catch (error: any) {
        console.error('Repair failed:', error);
        throw new Error('Veri tabanı onarımı başarısız: ' + error.message);
    }
};

/**
 * Manually sync a user's staffRole to all their existing shifts
 * Useful for fixing data inconsistencies.
 */
export const syncUserShiftRoles = async (userId: string, staffRole: StaffRole): Promise<void> => {
    try {
        console.log(`Manual sync: Updating all shifts for ${userId} to role ${staffRole}`);
        const scheduleRef = collection(db, 'schedule');
        const q = query(scheduleRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                    staffRole: staffRole,
                    updatedAt: new Date().toISOString()
                });
            });
            await batch.commit();
            console.log(`Synced ${snapshot.size} shifts.`);
        }
    } catch (error) {
        console.error('Error syncing shifts:', error);
        throw new Error('Vardiyalar senkronize edilemedi');
    }
};

/**
* Subscribe to users for real-time updates
*/
export const subscribeToUsers = (
    callback: (users: User[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, orderBy('fullName', 'asc'));

    return onSnapshot(
        q,
        (snapshot) => {
            const users = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];
            callback(users);
        },
        (error) => {
            console.error('User subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};

/**
 * Approve a pending user and assign staff role
 */
export const approveUser = async (
    userId: string,
    staffRole: StaffRole,
    rotationGroup?: RotationGroup
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const updateData: any = {
            isApproved: true,
            staffRole,
            updatedAt: new Date().toISOString(),
        };

        if (rotationGroup) {
            updateData.rotationGroup = rotationGroup;
        }

        await updateDoc(userRef, updateData);

        // Cascade staffRole update to schedule if potential shifts exist
        // (Unlikely for new approval, but possible for re-approval)
        const scheduleRef = collection(db, 'schedule');
        const q = query(scheduleRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                // Only update if role is different to save writes? Batch is cheap.
                batch.update(doc.ref, {
                    staffRole,
                    updatedAt: new Date().toISOString()
                });
            });
            await batch.commit();
        }

    } catch (error) {
        console.error('Error approving user:', error);
        throw new Error('Kullanıcı onaylanamadı');
    }
};

/**
 * Revoke user approval (set isApproved to false)
 */
export const revokeUserApproval = async (userId: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, {
            isApproved: false,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error revoking user approval:', error);
        throw new Error('Kullanıcı onayı geri alınamadı');
    }
};
