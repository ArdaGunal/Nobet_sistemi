import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    runTransaction,
    getDoc,
    orderBy,
    writeBatch,
    deleteDoc,
    getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { SwapRequest, ShiftAssignment, User, SwapStatus, SHIFT_SLOTS } from '../types';
import { createPersonalNotification } from './personalNotificationService';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const SWAP_COLLECTION = 'swap_requests';
const SCHEDULE_COLLECTION = 'schedule';

/**
 * Yeni bir takas isteği oluşturur (Step 1: User A -> User B)
 */
export const createSwapRequest = async (
    requester: { id: string, fullName: string },
    requesterShift: ShiftAssignment,
    targetUser: { id: string, fullName: string },
    targetShift: ShiftAssignment
) => {
    // Meslek Grubu Kontrolü (Role Validation)
    if (requesterShift.staffRole !== targetShift.staffRole) {
        throw new Error('Farklı meslek grupları arasında takas yapılamaz.');
    }

    // 48 saat sonrasını hesapla
    const expiresAt = Date.now() + (48 * 60 * 60 * 1000);

    const swapData: Omit<SwapRequest, 'id'> = {
        requesterId: requester.id,
        requesterName: requester.fullName,
        requesterShiftId: requesterShift.id,
        requesterDate: requesterShift.date,
        requesterSlot: requesterShift.shiftSlot,

        targetUserId: targetUser.id,
        targetUserName: targetUser.fullName,
        targetShiftId: targetShift.id,
        targetDate: targetShift.date,
        targetSlot: targetShift.shiftSlot,

        status: 'pending_user',
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
    };

    return await addDoc(collection(db, SWAP_COLLECTION), {
        ...swapData,
        timestamp: serverTimestamp()
    });
};

/**
 * Kullanıcıya gelen veya kullanıcının gönderdiği takas isteklerini dinler
 */
export const subscribeToSwapRequests = (userId: string, callback: (requests: SwapRequest[]) => void) => {
    // Hem gönderen hem alan olduğu durumları sorgula
    // Firestore'da OR sorgusu karmaşık olabilir, iki ayrı sorgu veya client-side filtreleme yapılabilir.
    // Şimdilik basitçe 'targetUserId'si user olanları (gelen teklifler) ve 'requesterId'si user olanları (gidenler) alacağız.
    // Ancak Firestore tek sorguda OR destekler (where 'in' veya yeni 'or').

    // Basitlik için iki ayrı sorgu yerine koleksiyonu dinleyip filtreleyelim VEYA or sorgusu deneyelim.
    // Expo/React Native ortamında 'or' desteği var mı kontrol etmek lazım, genelde var.

    // Şimdilik sadece gelen teklifleri (targetUserId) gösterelim, Dashboard'da "Gelen Teklif" önemli.
    // Gönderdiklerini de görmek isterse ayrı bir sekme yaparız.

    // İkisini de kapsayan sorgu:
    // (Bilinçli tercih: Tüm aktif swapları çekip client side filtrelemiyoruz, performance için ayrı sorgular gerekebilir ama şimdilik targetUserId öncelikli)

    const q = query(
        collection(db, SWAP_COLLECTION),
        where('targetUserId', '==', userId),
        // where('expiryAt', '>', Date.now()) // Süresi geçenleri client side veya server side filter
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SwapRequest));

        callback(requests);
    });
};

/**
 * Kullanıcının kendi başlattığı istekleri dinler
 */
export const subscribeToMySwapRequests = (userId: string, callback: (requests: SwapRequest[]) => void) => {
    const q = query(
        collection(db, SWAP_COLLECTION),
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SwapRequest));
        callback(requests);
    });
};

/**
 * Admin onayı bekleyen tüm istekleri dinler (Step 3)
 */
export const subscribeToAdminSwapRequests = (callback: (requests: SwapRequest[]) => void) => {
    const q = query(
        collection(db, SWAP_COLLECTION),
        where('status', '==', 'pending_admin'),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as SwapRequest));
        callback(requests);
    });
};

/**
 * User B: İsteği Onayla veya Reddet
 */
export const respondToSwapRequest = async (requestId: string, approve: boolean, swapRequest?: SwapRequest) => {
    const status: SwapStatus = approve ? 'pending_admin' : 'rejected';

    const ref = doc(db, SWAP_COLLECTION, requestId);
    await updateDoc(ref, {
        status: status,
        respondedAt: serverTimestamp()
    });

    // Eğer reddedildiyse bildirimi gönder
    if (!approve && swapRequest) {
        const slotInfo = SHIFT_SLOTS.find(s => s.id === swapRequest.requesterSlot);
        await createPersonalNotification(
            swapRequest.requesterId,
            'Takas Talebi Reddedildi',
            `Vardiya takas talebiniz, nöbet planlaması uygunluğu sağlanamadığı için onaylanmamıştır.`,
            'swap_rejected',
            'red'
        );
    }
};

/**
 * Admin: İsteği Onayla ve Vardiyaları Değiştir
 */
export const approveSwapByAdmin = async (swapRequest: SwapRequest) => {
    return await runTransaction(db, async (transaction) => {
        // 1. Swap isteğinin güncel durumunu kontrol et
        const swapRef = doc(db, SWAP_COLLECTION, swapRequest.id);
        const swapDoc = await transaction.get(swapRef);

        if (!swapDoc.exists()) throw new Error("Takas isteği bulunamadı.");
        const currentData = swapDoc.data() as SwapRequest;

        if (currentData.status !== 'pending_admin') {
            throw new Error("Bu istek artık onay bekleyen durumda değil.");
        }

        // 2. Vardiyaları getir
        const requesterShiftRef = doc(db, SCHEDULE_COLLECTION, swapRequest.requesterShiftId);
        const targetShiftRef = doc(db, SCHEDULE_COLLECTION, swapRequest.targetShiftId);

        const requesterShiftDoc = await transaction.get(requesterShiftRef);
        const targetShiftDoc = await transaction.get(targetShiftRef);

        if (!requesterShiftDoc.exists() || !targetShiftDoc.exists()) {
            throw new Error("Vardiyalardan biri silinmiş veya bulunamadı.");
        }

        const reqShiftData = requesterShiftDoc.data() as ShiftAssignment;
        const targetShiftData = targetShiftDoc.data() as ShiftAssignment;

        // Meslek Grubu Güvenlik Kontrolü (Double Check)
        if (reqShiftData.staffRole !== targetShiftData.staffRole) {
            throw new Error("Farklı meslek grupları arasında takas yapılamaz. (Güvenlik İhlali)");
        }

        // 3. Vardiya sahiplerini değiştir
        transaction.update(requesterShiftRef, {
            userId: swapRequest.targetUserId,
            userName: swapRequest.targetUserName,
            updatedAt: serverTimestamp() // Audit
        });

        transaction.update(targetShiftRef, {
            userId: swapRequest.requesterId,
            userName: swapRequest.requesterName,
            updatedAt: serverTimestamp() // Audit
        });

        // 4. Swap isteğini approved yap
        transaction.update(swapRef, {
            status: 'approved',
            adminApprovedAt: serverTimestamp()
        });

        // 5. Atomic Notifications (Inside Transaction)
        // Requester Notification
        const slotInfoRequester = SHIFT_SLOTS.find(s => s.id === swapRequest.targetSlot);
        const requesterFormattedDate = format(new Date(swapRequest.targetDate), 'd MMMM yyyy EEEE', { locale: tr });

        const requesterNotifRef = doc(collection(db, 'users', swapRequest.requesterId, 'personalNotifications'));
        transaction.set(requesterNotifRef, {
            title: 'Nöbet Takasınız Onaylandı',
            content: `Nöbet takasınız onaylanmıştır. Yeni nöbetiniz: ${requesterFormattedDate} tarihinde ${slotInfoRequester?.labelTr || swapRequest.targetSlot} vardiyası.`,
            type: 'swap_approved',
            color: 'green',
            isRead: false,
            createdAt: new Date().toISOString()
        });

        // Target User Notification
        const slotInfoTarget = SHIFT_SLOTS.find(s => s.id === swapRequest.requesterSlot);
        const targetFormattedDate = format(new Date(swapRequest.requesterDate), 'd MMMM yyyy EEEE', { locale: tr });

        const targetNotifRef = doc(collection(db, 'users', swapRequest.targetUserId, 'personalNotifications'));
        transaction.set(targetNotifRef, {
            title: 'Nöbet Takasınız Onaylandı',
            content: `Nöbet takasınız onaylanmıştır. Yeni nöbetiniz: ${targetFormattedDate} tarihinde ${slotInfoTarget?.labelTr || swapRequest.requesterSlot} vardiyası.`,
            type: 'swap_approved',
            color: 'green',
            isRead: false,
            createdAt: new Date().toISOString()
        });
    });
};

/**
 * Admin: İsteği Reddet
 */
export const rejectSwapByAdmin = async (requestId: string, swapRequest?: SwapRequest) => {
    const ref = doc(db, SWAP_COLLECTION, requestId);
    await updateDoc(ref, {
        status: 'rejected',
        adminRejectedAt: serverTimestamp()
    });

    // Bildirim gönder
    if (swapRequest) {
        await createPersonalNotification(
            swapRequest.requesterId,
            'Takas Talebi Reddedildi',
            `Vardiya takas talebiniz, nöbet planlaması uygunluğu sağlanamadığı için onaylanmamıştır.`,
            'swap_rejected',
            'red'
        );
    }
};

/**
 * Clean up old swap requests to save space and performance.
 * 1. Delete requests with 'expiresAt' < now
 * 2. Delete approved/rejected requests * Called by Admin Dashboard periodically.
 */
export const cleanupSwapRequests = async () => {
    try {
        console.log('Cleaning up swap requests...');
        const now = Date.now();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString();

        const batch = writeBatch(db);
        let count = 0;

        // Note: Complex queries might require composite indexes.
        // For simplicity and to avoid index requirement errors during runtime for the user,
        // we will fetch all and filter in memory if the collection isn't huge.
        // Or better, fetch by status if possible.
        // Let's assume the collection isn't massive (< 1000 active docs usually).

        // Actually, let's try to be specific to avoid reading too much.
        const q = query(collection(db, SWAP_COLLECTION));
        // Bringing all might be heavy if history grows. 
        // But since we are deleting old ones, it should stay small.

        const snapshot = await getDocs(q);

        snapshot.docs.forEach(doc => {
            const data = doc.data() as SwapRequest;
            let shouldDelete = false;

            // 1. Check Expiry (for pending requests)
            if (data.status === 'pending_user' && data.expiresAt && data.expiresAt < now) {
                shouldDelete = true;
            }

            // 2. Check Old Completed (approved/rejected)
            // Use createdAt as a proxy if completedAt dates aren't consistently reliable or simple to check.
            // Or use status + createdAt.
            if ((data.status === 'approved' || data.status === 'rejected') && data.createdAt < cutoffDate) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                batch.delete(doc.ref);
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Cleanup: ${count} old swap requests deleted.`);
        } else {
            console.log('Cleanup: No swap requests to delete.');
        }

        return count;
    } catch (error) {
        console.error('Swap cleanup failed:', error);
        return 0;
    }
};
