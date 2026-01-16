/**
 * Type Definitions for İsdemir Acil Servis Nöbet Takip
 */

// User roles in the system
export type UserRole = 'admin' | 'user';

// Shift slot types - Fixed time slots for the emergency service
export type ShiftSlot = '00:30-08:30' | '08:30-16:30' | '16:30-00:30';

// User document structure in Firestore
export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    createdAt?: string;
}

// Shift document structure in Firestore
export interface Shift {
    id: string;
    date: string; // ISO string format (YYYY-MM-DD)
    shiftSlot: ShiftSlot;
    userId: string;
    userName: string;
    createdAt?: string;
    updatedAt?: string;
}

// Shift slot display information
export interface ShiftSlotInfo {
    id: ShiftSlot;
    label: string;
    labelTr: string; // Turkish label
    startTime: string;
    endTime: string;
    color: string;
    icon: string;
}

// Predefined shift slots with metadata
export const SHIFT_SLOTS: ShiftSlotInfo[] = [
    {
        id: '00:30-08:30',
        label: 'Night',
        labelTr: 'Gece',
        startTime: '00:30',
        endTime: '08:30',
        color: '#6366f1', // Indigo
        icon: 'moon',
    },
    {
        id: '08:30-16:30',
        label: 'Day',
        labelTr: 'Gündüz',
        startTime: '08:30',
        endTime: '16:30',
        color: '#f59e0b', // Amber
        icon: 'sun',
    },
    {
        id: '16:30-00:30',
        label: 'Evening',
        labelTr: 'Akşam',
        startTime: '16:30',
        endTime: '00:30',
        color: '#8b5cf6', // Purple
        icon: 'sunset',
    },
];

// Authentication context state
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

// Form validation errors
export interface ValidationErrors {
    [key: string]: string;
}
