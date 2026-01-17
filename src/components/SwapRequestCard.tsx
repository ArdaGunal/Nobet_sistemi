import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Surface, Text, Button, useTheme, Portal, Dialog, Paragraph } from 'react-native-paper';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SwapRequest, SHIFT_SLOTS } from '@/src/types';
import { respondToSwapRequest } from '@/src/services/swapService';

interface SwapRequestCardProps {
    request: SwapRequest;
    currentUserId: string;
}

export const SwapRequestCard = ({ request, currentUserId }: SwapRequestCardProps) => {
    const theme = useTheme();
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [expanded, setExpanded] = useState(false);

    // Confirmation State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ accept: boolean } | null>(null);

    const isIncoming = request.targetUserId === currentUserId;

    useEffect(() => {
        const timer = setInterval(() => {
            if (request.expiresAt < Date.now()) {
                setTimeLeft('Süresi Doldu');
            } else {
                setTimeLeft(formatDistanceToNow(request.expiresAt, { locale: tr, addSuffix: true }));
            }
        }, 60000);

        if (request.expiresAt < Date.now()) {
            setTimeLeft('Süresi Doldu');
        } else {
            setTimeLeft(formatDistanceToNow(request.expiresAt, { locale: tr, addSuffix: true }));
        }

        return () => clearInterval(timer);
    }, [request.expiresAt]);

    const handleInitialClick = (accept: boolean) => {
        setPendingAction({ accept });
        setConfirmVisible(true);
    };

    const handleConfirm = async () => {
        if (!pendingAction) return;
        setConfirmVisible(false); // Close modal immediately

        setSubmitting(true);
        try {
            await respondToSwapRequest(request.id, pendingAction.accept, request);
        } catch (error) {
            console.error(error);
            alert('İşlem başarısız');
        } finally {
            setSubmitting(false);
            setPendingAction(null);
        }
    };

    const handleCancel = () => {
        setConfirmVisible(false);
        setPendingAction(null);
    };

    if (!isIncoming) return null;

    return (
        <>
            <Surface style={[styles.card, { borderColor: theme.colors.primary }]} elevation={2}>
                {/* Header / Summary Section */}
                <View style={styles.header}>
                    <View style={styles.headerTitleContainer}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                            🔄 Takas İsteği
                        </Text>
                        {!expanded && (
                            <Text variant="bodyMedium" numberOfLines={1} style={{ color: '#4b5563', marginTop: 2 }}>
                                <Text style={{ fontWeight: 'bold' }}>{request.requesterName}</Text> sizle takas istiyor.
                            </Text>
                        )}
                    </View>

                    <Button
                        mode={expanded ? "text" : "outlined"}
                        compact
                        onPress={() => setExpanded(!expanded)}
                        style={{ marginLeft: 8 }}
                    >
                        {expanded ? 'Gizle' : 'Detay'}
                    </Button>
                </View>

                {/* Expanded Content */}
                {expanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.divider} />

                        <Text variant="labelSmall" style={{ color: request.expiresAt < Date.now() ? 'red' : '#6b7280', marginBottom: 8, textAlign: 'right' }}>
                            {request.expiresAt < Date.now() ? '⚠️ Süresi Doldu' : `⏳ Son: ${timeLeft}`}
                        </Text>

                        <View style={styles.swapDetails}>
                            <View style={styles.swapItem}>
                                <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>SİZİN VARDİYANIZ</Text>
                                <View style={styles.dateBox}>
                                    <Text style={styles.dateText}>
                                        {format(new Date(request.targetDate), 'd MMM', { locale: tr })}
                                    </Text>
                                    <Text style={styles.slotText}>
                                        {SHIFT_SLOTS.find(s => s.id === request.targetSlot)?.labelTr}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.arrowIcon}>⇄</Text>

                            <View style={styles.swapItem}>
                                <Text variant="labelSmall" style={{ color: '#6b7280', marginBottom: 4 }}>{request.requesterName.split(' ')[0].toUpperCase()}</Text>
                                <View style={[styles.dateBox, { backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }]}>
                                    <Text style={[styles.dateText, { color: '#4338ca' }]}>
                                        {format(new Date(request.requesterDate), 'd MMM', { locale: tr })}
                                    </Text>
                                    <Text style={[styles.slotText, { color: '#6366f1' }]}>
                                        {SHIFT_SLOTS.find(s => s.id === request.requesterSlot)?.labelTr}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.actions}>
                            <Button
                                mode="outlined"
                                onPress={() => handleInitialClick(false)}
                                loading={submitting}
                                disabled={submitting}
                                style={{ flex: 1, borderColor: '#ef4444' }}
                                textColor="#ef4444"
                            >
                                Reddet
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => handleInitialClick(true)}
                                loading={submitting}
                                disabled={submitting}
                                style={{ flex: 1, backgroundColor: '#22c55e' }}
                            >
                                Kabul Et
                            </Button>
                        </View>
                    </View>
                )}
            </Surface>

            {/* Modern Confirmation Dialog */}
            <Portal>
                <Dialog visible={confirmVisible} onDismiss={handleCancel} style={{ backgroundColor: '#fff', borderRadius: 12, maxWidth: 340, alignSelf: 'center' }}>
                    <Dialog.Icon icon={pendingAction?.accept ? "check-circle-outline" : "alert-circle-outline"} size={32} color={pendingAction?.accept ? '#22c55e' : '#ef4444'} />
                    <Dialog.Title style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginTop: -10 }}>
                        {pendingAction?.accept ? 'Onaylıyor musunuz?' : 'Reddediyor musunuz?'}
                    </Dialog.Title>
                    <Dialog.Content>
                        <Paragraph style={{ textAlign: 'center', fontSize: 14 }}>
                            {pendingAction?.accept
                                ? <>Nöbetinizin <Text style={{ fontWeight: 'bold' }}>{format(new Date(request.requesterDate), 'd MMMM EEEE', { locale: tr })}</Text> gününe alınması için admin onayına gönderilecektir.</>
                                : 'Bu takas isteğini reddetmek üzeresiniz. Bu işlem geri alınamaz.'}
                        </Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions style={{ justifyContent: 'center', paddingBottom: 16 }}>
                        <Button onPress={handleCancel} mode="text" textColor="#6b7280" style={{ marginRight: 8 }}>Vazgeç</Button>
                        <Button
                            onPress={handleConfirm}
                            mode="contained"
                            style={{ backgroundColor: pendingAction?.accept ? '#22c55e' : '#ef4444', minWidth: 100 }}
                        >
                            {pendingAction?.accept ? 'Onayla' : 'Reddet'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderLeftWidth: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
    },
    expandedContent: {
        marginTop: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 8,
    },
    swapDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    swapItem: {
        alignItems: 'center',
        flex: 1,
    },
    dateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '100%',
    },
    dateText: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#1e293b',
    },
    slotText: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    arrowIcon: {
        fontSize: 24,
        color: '#94a3b8',
        marginHorizontal: 8,
        marginBottom: 16, // Align with text boxes
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    }
});
