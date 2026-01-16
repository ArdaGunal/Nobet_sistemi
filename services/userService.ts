/**
 * User Service
 * 
 * Handles all Firestore operations for user documents.
 * Provides CRUD operations for managing employees.
 */

import {
    collection,
    doc,
    addDoc,
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
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase.config';
import { User, UserRole } from '@/types';

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
    role: UserRole = 'user'
): Promise<User> => {
    try {
        // Create Firebase Auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        const now = new Date().toISOString();
        const userData: Omit<User, 'id'> = {
            email,
            fullName,
            role,
            createdAt: now,
        };

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
 * Update user information
 */
export const updateUser = async (
    userId: string,
    updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, updates);
    } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('Kullanıcı güncellenemedi');
    }
};

/**
 * Delete a user document (Note: This doesn't delete the Auth user)
 */
export const deleteUser = async (userId: string): Promise<void> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await deleteDoc(userRef);
    } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('Kullanıcı silinemedi');
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
