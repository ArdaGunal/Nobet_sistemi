/**
 * Authentication Context Provider
 * 
 * Manages user authentication state with Google Sign-In only.
 * Provides role-based access control and approval status throughout the app.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase.config';
import { User, AuthState } from '@/src/types';

// Extended auth context interface with methods
interface AuthContextType extends AuthState {
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    requestApproval: () => Promise<void>; // New: Request admin approval
    hasRequestedApproval: boolean; // New: Has user sent approval request
}

// Default context value
const defaultAuthContext: AuthContextType = {
    user: null,
    isLoading: true,
    isAuthenticated: false,
    isAdmin: false,
    isApproved: false,
    hasRequestedApproval: false,
    loginWithGoogle: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
    requestApproval: async () => { },
};

// Create the context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Props for the provider component
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * AuthProvider Component
 * Wraps the app and provides authentication state and methods
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetches user data from Firestore (does NOT create if not exists)
     */
    const fetchUser = async (firebaseUser: FirebaseUser): Promise<User | null> => {
        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    id: firebaseUser.uid,
                    email: userData.email || firebaseUser.email || '',
                    fullName: userData.fullName || firebaseUser.displayName || '',
                    role: userData.role || 'user',
                    staffRole: userData.staffRole,
                    rotationGroup: userData.rotationGroup,
                    isApproved: userData.isApproved || false,
                };
            }

            // User doesn't exist in Firestore - return auth-only user (no doc yet)
            // isApproved is undefined (not false) to indicate no request has been sent
            return {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                fullName: firebaseUser.displayName || '',
                role: 'user',
                // isApproved is NOT set - will be undefined
            };
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    /**
     * Request approval from admin (creates user document in Firestore)
     */
    const requestApproval = async (): Promise<void> => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;

        try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Create new user document with isApproved: false
                const newUser = {
                    email: firebaseUser.email || '',
                    fullName: firebaseUser.displayName || '',
                    role: 'user',
                    isApproved: false,
                    termsAccepted: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };

                await setDoc(userDocRef, newUser);

                // Refresh user state
                setUser({
                    id: firebaseUser.uid,
                    email: newUser.email,
                    fullName: newUser.fullName,
                    role: 'user',
                    isApproved: false,
                });
            }
        } catch (error) {
            console.error('Error requesting approval:', error);
            throw new Error('Onay isteği gönderilemedi');
        }
    };

    /**
     * Refresh user data from Firestore
     */
    const refreshUser = async (): Promise<void> => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            const userData = await fetchUser(firebaseUser);
            setUser(userData);
        }
    };

    /**
     * Login with Google
     */
    const loginWithGoogle = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const result = await signInWithPopup(auth, provider);
            const userData = await fetchUser(result.user);
            setUser(userData);
        } catch (error: any) {
            console.error('Google login error:', error);
            if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Giriş işlemi iptal edildi');
            } else if (error.code === 'auth/network-request-failed') {
                throw new Error('Ağ hatası. İnternet bağlantınızı kontrol edin.');
            }
            throw new Error('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout the current user
     */
    const logout = async (): Promise<void> => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
            throw new Error('Çıkış yapılamadı');
        }
    };

    // Listen for auth state changes and user data changes
    useEffect(() => {
        let unsubscribeUserDoc: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Subscribe to user document changes
                const userDocRef = doc(db, 'users', firebaseUser.uid);

                unsubscribeUserDoc = onSnapshot(userDocRef, (docSnapshot) => {
                    if (docSnapshot.exists()) {
                        const userData = docSnapshot.data();
                        setUser({
                            id: firebaseUser.uid,
                            email: userData.email || firebaseUser.email || '',
                            fullName: userData.fullName || firebaseUser.displayName || '',
                            role: userData.role || 'user',
                            staffRole: userData.staffRole,
                            rotationGroup: userData.rotationGroup,
                            isApproved: userData.isApproved || false,
                        });
                    } else {
                        // User exists in Auth but not Firestore (yet) - no request sent
                        // isApproved is undefined to indicate no doc exists
                        setUser({
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            fullName: firebaseUser.displayName || '',
                            role: 'user',
                            // isApproved is NOT set - will be undefined
                        });
                    }
                    setIsLoading(false);
                }, (error) => {
                    console.error('Error listening to user data:', error);
                    setIsLoading(false);
                });

            } else {
                // User logged out
                setUser(null);
                setIsLoading(false);
                if (unsubscribeUserDoc) {
                    unsubscribeUserDoc();
                }
            }
        });

        // Cleanup subscription
        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) {
                unsubscribeUserDoc();
            }
        };
    }, []);

    // Compute derived state
    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const isApproved = user?.isApproved === true || isAdmin; // Admins are always approved

    // Check if user has requested approval (user doc exists in Firestore)
    // If isApproved is explicitly false (not undefined), user has requested
    const hasRequestedApproval = user?.isApproved === false;

    // Context value
    const value: AuthContextType = {
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        isApproved,
        hasRequestedApproval,
        loginWithGoogle,
        logout,
        refreshUser,
        requestApproval,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
