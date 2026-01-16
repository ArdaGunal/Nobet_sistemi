/**
 * Schedule Service
 * 
 * Handles shift scheduling, rotation calculations, and calendar generation
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    writeBatch,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/config/firebase.config';
import {
    ShiftAssignment,
    ShiftSlot,
    StaffRole,
    RotationGroup,
    DailyShift,
    SHIFT_SLOTS,
    SHIFT_REQUIREMENTS,
    ROTATION_CYCLE_WEEKS
} from '@/src/types';

const SCHEDULE_COLLECTION = 'schedule';

// ========================================
// CRUD İŞLEMLERİ
// ========================================

/**
 * Tek bir vardiya ataması oluştur
 */
export const createShiftAssignment = async (
    date: string,
    shiftSlot: ShiftSlot,
    userId: string,
    userName: string,
    staffRole: StaffRole
): Promise<ShiftAssignment> => {
    try {
        const now = new Date().toISOString();
        const docRef = await addDoc(collection(db, SCHEDULE_COLLECTION), {
            date,
            shiftSlot,
            userId,
            userName,
            staffRole,
            createdAt: now,
            updatedAt: now,
        });

        return {
            id: docRef.id,
            date,
            shiftSlot,
            userId,
            userName,
            staffRole,
            createdAt: now,
            updatedAt: now,
        };
    } catch (error) {
        console.error('Error creating shift assignment:', error);
        throw new Error('Vardiya ataması oluşturulamadı');
    }
};

/**
 * Vardiya atamasını güncelle
 */
export const updateShiftAssignment = async (
    assignmentId: string,
    updates: Partial<Omit<ShiftAssignment, 'id' | 'createdAt'>>
): Promise<void> => {
    try {
        const docRef = doc(db, SCHEDULE_COLLECTION, assignmentId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error updating shift assignment:', error);
        throw new Error('Vardiya ataması güncellenemedi');
    }
};

/**
 * Vardiya atamasını sil
 */
export const deleteShiftAssignment = async (assignmentId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, SCHEDULE_COLLECTION, assignmentId));
    } catch (error) {
        console.error('Error deleting shift assignment:', error);
        throw new Error('Vardiya ataması silinemedi');
    }
};

/**
 * Belirli bir kullanıcının belirli bir tarihteki vardiyasını bul
 */
export const findAssignment = async (
    userId: string,
    date: string,
    shiftSlot: ShiftSlot
): Promise<ShiftAssignment | null> => {
    try {
        const q = query(
            collection(db, SCHEDULE_COLLECTION),
            where('userId', '==', userId),
            where('date', '==', date),
            where('shiftSlot', '==', shiftSlot)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ShiftAssignment;
    } catch (error) {
        console.error('Error finding assignment:', error);
        return null;
    }
};

/**
 * Belirli bir tarihteki tüm atamaları getir
 */
export const getAssignmentsByDate = async (date: string): Promise<ShiftAssignment[]> => {
    try {
        const q = query(
            collection(db, SCHEDULE_COLLECTION),
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShiftAssignment[];
    } catch (error) {
        console.error('Error fetching assignments:', error);
        throw new Error('Vardiya atamaları yüklenemedi');
    }
};

/**
 * Tarih aralığındaki tüm atamaları getir
 */
export const getAssignmentsByDateRange = async (
    startDate: string,
    endDate: string
): Promise<ShiftAssignment[]> => {
    try {
        const q = query(
            collection(db, SCHEDULE_COLLECTION),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShiftAssignment[];
    } catch (error) {
        console.error('Error fetching assignments:', error);
        throw new Error('Vardiya atamaları yüklenemedi');
    }
};

/**
 * Tarih aralığına abone ol (gerçek zamanlı)
 */
export const subscribeToDateRange = (
    startDate: string,
    endDate: string,
    callback: (assignments: ShiftAssignment[]) => void,
    onError?: (error: Error) => void
): Unsubscribe => {
    const q = query(
        collection(db, SCHEDULE_COLLECTION),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const assignments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as ShiftAssignment[];
            callback(assignments);
        },
        (error) => {
            console.error('Schedule subscription error:', error);
            onError?.(new Error('Gerçek zamanlı güncelleme hatası'));
        }
    );
};

// ========================================
// ROTASYON HESAPLAMA
// ========================================

/**
 * Haftanın hangi günü olduğunu döndür (0=Pazar, 6=Cumartesi)
 */
export const getDayOfWeek = (date: Date): number => {
    return date.getDay();
};

/**
 * Hafta sonu mu kontrol et
 */
export const isWeekend = (date: Date): boolean => {
    const day = getDayOfWeek(date);
    return day === 0 || day === 6; // Pazar veya Cumartesi
};

/**
 * Rotasyon grubunu hesapla (3 haftalık döngü)
 */
export const calculateRotationGroup = (
    date: Date,
    baseDate: Date = new Date('2026-01-05') // Başlangıç tarihi
): RotationGroup => {
    const diffTime = date.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7);
    const cyclePosition = weekNumber % (ROTATION_CYCLE_WEEKS * 3); // 9 haftalık tam döngü

    // Her grup 3 hafta çalışır
    if (cyclePosition < 3) return 'A';
    if (cyclePosition < 6) return 'B';
    return 'C';
};

/**
 * Belirli bir vardiya slotu için hangi grubun çalışacağını hesapla
 */
export const getShiftGroupForSlot = (
    date: Date,
    slot: ShiftSlot
): RotationGroup => {
    const baseGroup = calculateRotationGroup(date);
    const slotIndex = SHIFT_SLOTS.findIndex(s => s.id === slot);

    // Saat yönünde rotasyon
    const groups: RotationGroup[] = ['A', 'B', 'C'];
    const baseIndex = groups.indexOf(baseGroup);
    const adjustedIndex = (baseIndex + slotIndex) % 3;

    return groups[adjustedIndex];
};

// ========================================
// TAKVİM OLUŞTURMA
// ========================================

/**
 * Aylık takvim verisi oluştur
 */
export const generateMonthCalendar = (year: number, month: number): DailyShift[] => {
    const calendar: DailyShift[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];

        calendar.push({
            date: dateStr,
            isWeekend: isWeekend(date),
            slots: {
                '00:30-08:30': [],
                '08:30-16:30': [],
                '16:30-00:30': [],
            },
        });
    }

    return calendar;
};

/**
 * Atamaları takvime yerleştir
 */
export const populateCalendarWithAssignments = (
    calendar: DailyShift[],
    assignments: ShiftAssignment[]
): DailyShift[] => {
    const calendarMap = new Map<string, DailyShift>();

    // Takvimi map'e dönüştür
    calendar.forEach(day => {
        calendarMap.set(day.date, { ...day, slots: { ...day.slots } });
    });

    // Atamaları yerleştir
    assignments.forEach(assignment => {
        const day = calendarMap.get(assignment.date);
        if (day && day.slots[assignment.shiftSlot]) {
            day.slots[assignment.shiftSlot].push(assignment);
        }
    });

    return Array.from(calendarMap.values());
};

/**
 * Vardiya eksikliği kontrol et
 */
export const checkShiftRequirements = (
    assignments: ShiftAssignment[]
): { isValid: boolean; missing: { role: StaffRole; count: number }[] } => {
    const counts: Record<StaffRole, number> = {
        saglikci: 0,
        surucu: 0,
        paramedik: 0,
    };

    assignments.forEach(a => {
        if (counts[a.staffRole] !== undefined) {
            counts[a.staffRole]++;
        }
    });

    const missing: { role: StaffRole; count: number }[] = [];

    (Object.keys(SHIFT_REQUIREMENTS) as (keyof typeof SHIFT_REQUIREMENTS)[]).forEach(role => {
        if (role !== 'total') {
            const required = SHIFT_REQUIREMENTS[role as StaffRole];
            const current = counts[role as StaffRole] || 0;
            if (current < required) {
                missing.push({ role: role as StaffRole, count: required - current });
            }
        }
    });

    return {
        isValid: missing.length === 0,
        missing,
    };
};
