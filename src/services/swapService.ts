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
    orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase.config';
import { SwapRequest, ShiftAssignment, User, SwapStatus, SHIFT_SLOTS } from '../types';
import { createNotification } from './notificationService';

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
        await createNotification(
            swapRequest.requesterId,
            'swap_rejected',
            'Takas Talebi Reddedildi',
            `Vardiya takas talebiniz, nöbet planlaması uygunluğu sağlanamadığı için onaylanmamıştır.`,
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
    });

    // Bildirim gönder (transaction dışında)
    const slotInfo = SHIFT_SLOTS.find(s => s.id === swapRequest.targetSlot);
    await createNotification(
        swapRequest.requesterId,
        'swap_approved',
        'Nöbet Takasınız Onaylandı',
        `Nöbet takasınız onaylanmıştır. Yeni nöbetiniz: ${swapRequest.targetDate} tarihinde ${slotInfo?.labelTr || swapRequest.targetSlot} vardiyası.`,
        'green'
    );
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
        await createNotification(
            swapRequest.requesterId,
            'swap_rejected',
            'Takas Talebi Reddedildi',
            `Vardiya takas talebiniz, nöbet planlaması uygunluğu sağlanamadığı için onaylanmamıştır.`,
            'red'
        );
    }
};
