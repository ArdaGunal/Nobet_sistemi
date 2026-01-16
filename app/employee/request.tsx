/**
 * Employee Request Screen
 * 
 * Allows employees to submit shift requests (swap, leave, preference)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    TextInput,
    Button,
    Chip,
    SegmentedButtons,
    Divider,
    List,
    IconButton
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { useAuth } from '@/context/AuthContext';
import { ShiftRequest, RequestType, REQUEST_TYPES, User } from '@/src/types';
import { createRequest, subscribeToUserRequests } from '@/src/services/requestService';
import { subscribeToUsers } from '@/src/services/userService';
import { DatePicker } from '@/src/components';

export default function EmployeeRequestScreen() {
    const theme = useTheme();
    const { user: currentUser } = useAuth();

    // Form state
    const [requestType, setRequestType] = useState<RequestType>('leave');
    const [requestedDate, setRequestedDate] = useState(new Date());
    const [targetDate, setTargetDate] = useState(new Date());
    const [targetUser, setTargetUser] = useState<User | null>(null);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        if (!currentUser) return;

        const unsubRequests = subscribeToUserRequests(
            currentUser.id,
            (data) => setMyRequests(data)
        );

        const unsubUsers = subscribeToUsers((data) => {
            // Filter out current user
            setUsers(data.filter(u => u.id !== currentUser.id));
        });

        return () => {
            unsubRequests();
            unsubUsers();
        };
    }, [currentUser]);

    const handleSubmit = async () => {
        if (!currentUser) return;

        if (!message.trim()) {
            Alert.alert('Hata', 'Lütfen bir açıklama yazın');
            return;
        }

        if (requestType === 'swap' && !targetUser) {
            Alert.alert('Hata', 'Lütfen takas yapacağınız kişiyi seçin');
            return;
        }

        setSubmitting(true);
        try {
            await createRequest(
                currentUser.id,
                currentUser.fullName,
                currentUser.staffRole || 'saglikci',
                requestType,
                requestedDate.toISOString().split('T')[0],
                message.trim(),
                requestType === 'swap' ? targetDate.toISOString().split('T')[0] : undefined,
                targetUser?.id,
                targetUser?.fullName
            );

            // Reset form
            setMessage('');
            setTargetUser(null);
            Alert.alert('Başarılı', 'İsteğiniz gönderildi');
        } catch (error: any) {
            Alert.alert('Hata', error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: ShiftRequest['status']) => {
        switch (status) {
            case 'pending': return '#f59e0b';
            case 'approved': return '#22c55e';
            case 'rejected': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusLabel = (status: ShiftRequest['status']) => {
        switch (status) {
            case 'pending': return 'Bekliyor';
            case 'approved': return 'Onaylandı';
            case 'rejected': return 'Reddedildi';
            default: return status;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                        İstek Gönder
                    </Text>
                </View>

                {/* New Request Form */}
                <Surface style={styles.formCard} elevation={1}>
                    <Text variant="titleMedium" style={{ marginBottom: 16 }}>Yeni İstek</Text>

                    {/* Request Type */}
                    <Text variant="labelMedium" style={{ marginBottom: 8 }}>İstek Türü</Text>
                    <SegmentedButtons
                        value={requestType}
                        onValueChange={value => setRequestType(value as RequestType)}
                        buttons={REQUEST_TYPES.map(t => ({
                            value: t.id,
                            label: t.labelTr,
                            icon: t.icon,
                        }))}
                        style={{ marginBottom: 16 }}
                    />

                    {/* Date Selection */}
                    <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                        {requestType === 'swap' ? 'Vermek İstediğiniz Tarih' : 'Talep Tarihi'}
                    </Text>
                    <DatePicker date={requestedDate} onChange={setRequestedDate} />

                    {/* Swap specific fields */}
                    {requestType === 'swap' && (
                        <>
                            <Text variant="labelMedium" style={{ marginTop: 16, marginBottom: 8 }}>
                                Almak İstediğiniz Tarih
                            </Text>
                            <DatePicker date={targetDate} onChange={setTargetDate} />

                            <Text variant="labelMedium" style={{ marginTop: 16, marginBottom: 8 }}>
                                Takas Yapılacak Kişi
                            </Text>
                            <View style={styles.userSelector}>
                                {targetUser ? (
                                    <Chip
                                        onClose={() => setTargetUser(null)}
                                        style={{ marginBottom: 8 }}
                                    >
                                        {targetUser.fullName}
                                    </Chip>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {users.slice(0, 5).map(user => (
                                            <Chip
                                                key={user.id}
                                                onPress={() => setTargetUser(user)}
                                                style={{ marginRight: 8 }}
                                            >
                                                {user.fullName}
                                            </Chip>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        </>
                    )}

                    {/* Message */}
                    <TextInput
                        mode="outlined"
                        label="Açıklama"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={3}
                        placeholder="İsteğinizin nedenini açıklayın..."
                        style={{ marginTop: 16 }}
                    />

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        icon="send"
                        style={{ marginTop: 16 }}
                    >
                        Gönder
                    </Button>
                </Surface>

                {/* My Requests */}
                <Text variant="titleMedium" style={{ marginTop: 24, marginBottom: 12 }}>
                    Önceki İsteklerim
                </Text>

                {myRequests.length === 0 ? (
                    <Surface style={styles.emptyCard} elevation={0}>
                        <Text style={{ color: theme.colors.secondary }}>
                            Henüz istek göndermediniz.
                        </Text>
                    </Surface>
                ) : (
                    myRequests.map(request => (
                        <Surface key={request.id} style={styles.requestCard} elevation={1}>
                            <View style={styles.requestHeader}>
                                <Chip compact>
                                    {REQUEST_TYPES.find(t => t.id === request.type)?.labelTr}
                                </Chip>
                                <Chip
                                    compact
                                    style={{ backgroundColor: getStatusColor(request.status) + '20' }}
                                    textStyle={{ color: getStatusColor(request.status) }}
                                >
                                    {getStatusLabel(request.status)}
                                </Chip>
                            </View>
                            <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                                {format(new Date(request.requestedDate), 'd MMMM yyyy', { locale: tr })}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginTop: 4 }}>
                                "{request.message}"
                            </Text>
                            {request.adminResponse && (
                                <Text variant="bodySmall" style={{ marginTop: 8, fontStyle: 'italic' }}>
                                    Admin yanıtı: {request.adminResponse}
                                </Text>
                            )}
                        </Surface>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 16,
    },
    formCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    userSelector: {
        minHeight: 40,
    },
    emptyCard: {
        padding: 24,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    requestCard: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff',
        marginBottom: 8,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});
