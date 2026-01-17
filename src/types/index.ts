// ========================================
// KULLANICI & ROL TİPLERİ
// ========================================

export type UserRole = 'super_admin' | 'admin' | 'user';

// Personel meslek türleri
export type StaffRole = 'saglikci' | 'surucu' | 'paramedik';

// Rotasyon grupları (A, B, C - 3 haftalık döngü)
export type RotationGroup = 'A' | 'B' | 'C';

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    staffRole?: StaffRole;      // Personel meslek türü
    rotationGroup?: RotationGroup; // Hangi rotasyon grubunda
    isApproved?: boolean;       // Admin tarafından onaylandı mı?
    createdAt?: string;
}

// Personel rolleri bilgisi
export const STAFF_ROLES: { id: StaffRole; labelTr: string; color: string }[] = [
    { id: 'saglikci', labelTr: 'Sağlıkçı', color: '#22c55e' },   // Green
    { id: 'surucu', labelTr: 'Sürücü', color: '#3b82f6' },       // Blue
    { id: 'paramedik', labelTr: 'Paramedik', color: '#ef4444' }, // Red
];

// ========================================
// VARDİYA TİPLERİ
// ========================================

export type ShiftSlot = '00:30-08:30' | '08:30-16:30' | '16:30-00:30';

export interface ShiftSlotInfo {
    id: ShiftSlot;
    labelTr: string;
    startTime: string;
    endTime: string;
    color: string;
}

export const SHIFT_SLOTS: ShiftSlotInfo[] = [
    { id: '00:30-08:30', labelTr: 'Gece', startTime: '00:30', endTime: '08:30', color: '#1e3a8a' },
    { id: '08:30-16:30', labelTr: 'Gündüz', startTime: '08:30', endTime: '16:30', color: '#eab308' },
    { id: '16:30-00:30', labelTr: 'Akşam', startTime: '16:30', endTime: '00:30', color: '#f97316' },
];

// Tek bir vardiyada atanan personel
export interface ShiftAssignment {
    id: string;
    date: string;           // YYYY-MM-DD
    shiftSlot: ShiftSlot;
    userId: string;
    userName: string;
    staffRole: StaffRole;   // Hangi rol ile atandı
    createdAt?: string;
    updatedAt?: string;
}

// Günlük vardiya özeti (tüm slotlar için)
export interface DailyShift {
    date: string;
    isWeekend: boolean;
    slots: {
        [key in ShiftSlot]: ShiftAssignment[];
    };
}

// Eski Shift tipi (geriye uyumluluk)
export interface Shift {
    id: string;
    date: string;
    shiftSlot: ShiftSlot;
    userId: string;
    userName: string;
    createdAt?: string;
    updatedAt?: string;
}

// ========================================
// ÇALIŞAN İSTEK SİSTEMİ
// ========================================

export type RequestType = 'swap' | 'leave' | 'preference';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestAction = 'add' | 'remove';
export type SwapStatus = 'pending_user' | 'pending_admin' | 'approved' | 'rejected' | 'expired';

export interface SwapRequest {
    id: string;
    // İsteyen Kişi (User A)
    requesterId: string;
    requesterName: string;
    requesterShiftId: string; // User A'nın vermek istediği vardiya ID
    requesterDate: string;    // Vardiya tarihi
    requesterSlot: ShiftSlot; // Vardiya saati

    // Hedef Kişi (User B)
    targetUserId: string;
    targetUserName: string;
    targetShiftId: string;    // User B'nin sahip olduğu vardiya ID
    targetDate: string;
    targetSlot: ShiftSlot;

    status: SwapStatus;
    expiresAt: number;        // Timestamp (48 saat süre)
    createdAt: string;
}

export interface ShiftRequest {
    id: string;
    userId: string;
    userName: string;
    userStaffRole: StaffRole;
    type: RequestType;
    action?: RequestAction;      // 'add' = vardiyaya girmek, 'remove' = vardiyadan çıkmak
    shiftSlot?: ShiftSlot;       // İstenen vardiya dilimi
    requestedDate: string;       // İstek yapılan tarih
    // targetDate alanı swap özelindeydi ama yeni sistemde SwapRequest kullanacağız.
    // Ancak geriye uyumluluk veya 'preference' tipi istekler için tutabiliriz.
    targetDate?: string;
    targetUserId?: string;       // Takas için hedef kişi
    targetUserName?: string;
    message: string;             // Açıklama
    status: RequestStatus;
    adminResponse?: string;      // Admin yanıtı
    createdAt: string;
    updatedAt?: string;
}

// Request type bilgileri
export const REQUEST_TYPES: { id: RequestType; labelTr: string; icon: string }[] = [
    { id: 'swap', labelTr: 'Vardiya Takası', icon: 'swap-horizontal' },
    { id: 'leave', labelTr: 'İzin Talebi', icon: 'calendar-remove' },
    { id: 'preference', labelTr: 'Tercih Bildirimi', icon: 'star' },
];

// ========================================
// İLETİŞİM SİSTEMİ (CHAT)
// ========================================

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    senderRole?: UserRole; // 'admin' | 'super_admin' | 'user'
    createdAt: string; // ISO string
    isRead: boolean;
}

export interface ChatRoom {
    id: string; // userId ile aynı olacak
    userId: string;
    userName: string;
    userEmail?: string;
    userRole: UserRole;
    lastMessage: string;
    lastMessageTime: string;
    unreadCountAdmin: number; // Adminin okumadığı mesaj sayısı
    unreadCountUser: number;  // Kullanıcının okumadığı mesaj sayısı
    updatedAt: string;
}

// ========================================
// YARDIMCI TİPLER
// ========================================

export interface ValidationErrors {
    [key: string]: string;
}

export interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isApproved: boolean;
}

// Announcement Types
export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    createdBy: string;
    creatorName: string;
    priority: 'normal' | 'urgent';
    isActive: boolean;
    readBy: string[]; // List of user IDs who read the announcement
}

// Kişiye özel bildirim tipi
export type NotificationType = 'swap_approved' | 'swap_rejected' | 'system';

export interface UserNotification {
    id: string;
    userId: string;              // Bildirimi alan kullanıcı
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    color?: 'green' | 'red' | 'blue';  // Görsel renk
    createdAt: string;
}

// Vardiya minimum personel sayısı kuralı
export const SHIFT_REQUIREMENTS = {
    saglikci: 2,
    surucu: 2,
    paramedik: 2,
    total: 6,
};

// Rotasyon döngüsü (3 hafta)
export const ROTATION_CYCLE_WEEKS = 3;

// Dinlenme süresi (saat)
export const REST_HOURS = 56;
