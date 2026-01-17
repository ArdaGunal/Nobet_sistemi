import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
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

    const isIncoming = request.targetUserId === currentUserId;
    const isOutgoing = request.requesterId === currentUserId;

    useEffect(() => {
        const timer = setInterval(() => {
            if (request.expiresAt < Date.now()) {
                setTimeLeft('Süresi Doldu');
            } else {
                setTimeLeft(formatDistanceToNow(request.expiresAt, { locale: tr, addSuffix: true }));
            }
        }, 60000);

        // Initial set
        if (request.expiresAt < Date.now()) {
            setTimeLeft('Süresi Doldu');
        } else {
            setTimeLeft(formatDistanceToNow(request.expiresAt, { locale: tr, addSuffix: true }));
        }

        return () => clearInterval(timer);
    }, [request.expiresAt]);

    const handleRespond = async (accept: boolean) => {
        setSubmitting(true);
        try {
            await respondToSwapRequest(request.id, accept);
        } catch (error) {
            console.error(error);
            alert('İşlem başarısız');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isIncoming) return null; // Şimdilik sadece gelen istekleri gösterelim

    return (
        <Surface style={[styles.card, { borderColor: theme.colors.primary }]} elevation={2}>
            <View style={styles.header}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    🔄 Vardiya Takas İsteği
                </Text>
                <Text variant="labelSmall" style={{ color: request.expiresAt < Date.now() ? 'red' : '#6b7280' }}>
                    {request.expiresAt < Date.now() ? 'Süresi Doldu' : `Son: ${timeLeft}`}
                </Text>
            </View>

            <View style={styles.content}>
                <Text variant="bodyMedium">
                    <Text style={{ fontWeight: 'bold' }}>{request.requesterName}</Text> sizinle vardiyasını değiştirmek istiyor.
                </Text>

                <View style={styles.swapDetails}>
                    <View style={styles.swapItem}>
                        <Text variant="labelSmall" style={{ color: '#6b7280' }}>SİZİN VARDİYANIZ</Text>
                        <Text style={{ fontWeight: 'bold' }}>
                            {format(new Date(request.targetDate), 'd MMMM', { locale: tr })}
                        </Text>
                        <Text style={{ fontSize: 12 }}>
                            {SHIFT_SLOTS.find(s => s.id === request.targetSlot)?.labelTr}
                        </Text>
                    </View>

                    <Text style={{ fontSize: 20 }}>⇄</Text>

                    <View style={styles.swapItem}>
                        <Text variant="labelSmall" style={{ color: '#6b7280' }}>ONUN VARDİYASI</Text>
                        <Text style={{ fontWeight: 'bold' }}>
                            {format(new Date(request.requesterDate), 'd MMMM', { locale: tr })}
                        </Text>
                        <Text style={{ fontSize: 12 }}>
                            {SHIFT_SLOTS.find(s => s.id === request.requesterSlot)?.labelTr}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <Button
                    mode="outlined"
                    onPress={() => handleRespond(false)}
                    loading={submitting}
                    disabled={submitting}
                    style={{ flex: 1, borderColor: '#ef4444' }}
                    textColor="#ef4444"
                >
                    Reddet
                </Button>
                <Button
                    mode="contained"
                    onPress={() => handleRespond(true)}
                    loading={submitting}
                    disabled={submitting}
                    style={{ flex: 1, backgroundColor: '#22c55e' }}
                >
                    Kabul Et
                </Button>
            </View>
        </Surface>
    );
};

const styles = StyleSheet.create({
    card: {
        margin: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderLeftWidth: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    content: {
        gap: 12,
    },
    swapDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 8,
    },
    swapItem: {
        alignItems: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    }
});
