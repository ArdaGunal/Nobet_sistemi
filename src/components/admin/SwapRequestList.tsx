import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform, Alert, Button, Pressable } from 'react-native';
import { Text, Button as PaperButton, Chip, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SwapRequest, SHIFT_SLOTS } from '@/src/types';
import { subscribeToAdminSwapRequests, approveSwapByAdmin, rejectSwapByAdmin } from '@/src/services/swapService';

export const SwapRequestList = () => {
    const theme = useTheme();
    const [requests, setRequests] = useState<SwapRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAdminSwapRequests((data) => {
            setRequests(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        visible: boolean;
        type: 'approve' | 'reject';
        request: SwapRequest | null;
    }>({ visible: false, type: 'approve', request: null });

    const initiateAction = (req: SwapRequest, type: 'approve' | 'reject') => {
        setConfirmState({ visible: true, type, request: req });
    };

    const handleConfirm = async () => {
        if (!confirmState.request) return;

        const req = confirmState.request;
        const type = confirmState.type;

        // Close modal first
        setConfirmState(prev => ({ ...prev, visible: false }));

        await performAction(req, type);
    };

    const handleReject = async (req: SwapRequest) => {
        initiateAction(req, 'reject');
    };

    const handleApprove = async (req: SwapRequest) => {
        initiateAction(req, 'approve');
    };

    const performAction = async (req: SwapRequest, action: 'approve' | 'reject') => {
        setProcessingId(req.id);
        try {
            if (action === 'approve') {
                await approveSwapByAdmin(req);
                // Başarı mesajı (Toast veya basit alert yerine console yeterli, liste güncelleniyor)
            } else {
                await rejectSwapByAdmin(req.id);
            }
        } catch (e: any) {
            console.error(e);
            alert('Hata: ' + e.message);
        } finally {
            setProcessingId(null);
        }
    };

    const renderItem = ({ item }: { item: SwapRequest }) => {
        const isProcessing = processingId === item.id;

        return (
            <View style={styles.card}>
                <View style={styles.header}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>🔄 Takas İsteği</Text>

                    <Chip compact style={{ backgroundColor: '#e0f2fe' }}>Onay Bekliyor</Chip>
                </View>

                <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>
                    {format(new Date(item.createdAt), 'd MMM HH:mm', { locale: tr })}
                </Text>

                <View style={styles.swapContainer}>
                    <View style={styles.side}>
                        <Text style={styles.name}>{item.requesterName}</Text>
                        <Text variant="bodySmall">{format(new Date(item.requesterDate), 'd MMM', { locale: tr })}</Text>
                        <Text variant="bodySmall" style={styles.slot}>{SHIFT_SLOTS.find(s => s.id === item.requesterSlot)?.labelTr}</Text>
                    </View>
                    <Text style={styles.arrow}>⇄</Text>
                    <View style={styles.side}>
                        <Text style={styles.name}>{item.targetUserName}</Text>
                        <Text variant="bodySmall">{format(new Date(item.targetDate), 'd MMM', { locale: tr })}</Text>
                        <Text variant="bodySmall" style={styles.slot}>{SHIFT_SLOTS.find(s => s.id === item.targetSlot)?.labelTr}</Text>
                    </View>
                </View>

                {/* Custom Action Buttons for Web Compatibility */}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.btn, styles.btnReject, isProcessing && styles.btnDisabled]}
                        onPress={() => initiateAction(item, 'reject')}
                        disabled={!!processingId} // Disable all buttons if any processing? No, just this one.
                    >
                        <Text style={styles.btnTextReject}>Reddet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.btn, styles.btnApprove, isProcessing && styles.btnDisabled]}
                        onPress={() => initiateAction(item, 'approve')}
                        disabled={!!processingId}
                    >
                        <Text style={styles.btnTextApprove}>{isProcessing ? 'İşleniyor...' : 'Onayla'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return <ActivityIndicator style={{ marginTop: 20 }} />;
    }

    return (
        <View style={{ flex: 1 }}>
            {requests.length === 0 ? (
                <View style={styles.empty}>
                    <Text variant="bodyLarge">Bekleyen takas isteği yok.</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16, gap: 16 }}
                />
            )}

            {/* CUSTOM CONFIRMATION OVERLAY */}
            {confirmState.visible && (
                <View style={styles.overlay}>
                    <View style={styles.confirmBox}>
                        <Text variant="titleLarge" style={{ textAlign: 'center', marginBottom: 8 }}>
                            {confirmState.type === 'approve' ? 'Onayla' : 'Reddet'}
                        </Text>
                        <Text style={{ textAlign: 'center', color: '#555', marginBottom: 20 }}>
                            {confirmState.type === 'approve'
                                ? 'Bu takas işlemini onaylamak üzeresiniz. Vardiyalar yer değiştirecektir.'
                                : 'Bu takas isteğini reddetmek üzeresiniz.'}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: '#f3f4f6' }]}
                                onPress={() => setConfirmState(p => ({ ...p, visible: false }))}
                            >
                                <Text style={{ fontWeight: 'bold' }}>İptal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: confirmState.type === 'approve' ? '#22c55e' : '#ef4444' }]}
                                onPress={handleConfirm}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                    {confirmState.type === 'approve' ? 'Evet, Onayla' : 'Evet, Reddet'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        // No elevation/shadow for web safety
        borderWidth: 1,
        borderColor: '#e5e7eb'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    swapContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
        marginBottom: 16
    },
    side: {
        flex: 1,
        alignItems: 'center'
    },
    arrow: {
        fontSize: 24,
        color: '#9ca3af',
        marginHorizontal: 8
    },
    name: {
        fontWeight: 'bold',
        fontSize: 14
    },
    slot: {
        backgroundColor: '#e0f2fe',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        fontSize: 10,
        overflow: 'hidden'
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    btn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    btnReject: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ef4444'
    },
    btnApprove: {
        backgroundColor: '#22c55e'
    },
    btnDisabled: {
        opacity: 0.6
    },
    btnTextReject: {
        color: '#ef4444',
        fontWeight: 'bold'
    },
    btnTextApprove: {
        color: '#fff',
        fontWeight: 'bold'
    },
    empty: {
        padding: 32,
        alignItems: 'center'
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
    },
    confirmBox: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    confirmBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    }
});
