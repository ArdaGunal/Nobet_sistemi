/**
 * Requests Management Screen (Admin Only)
 * 
 * View and manage employee shift requests and new user registrations.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Platform, TouchableOpacity } from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    IconButton,
    Button,
    Chip,
    ActivityIndicator,
    Divider,
    Portal,
    Modal,
    Dialog,
    Paragraph,
    TextInput,
    SegmentedButtons,
    RadioButton
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SwapRequestList } from '@/src/components/admin/SwapRequestList'; // New Component

import { useAuth } from '@/context/AuthContext';
import { ShiftRequest, REQUEST_TYPES, STAFF_ROLES, User, StaffRole, RotationGroup, SHIFT_SLOTS } from '@/src/types';
import { subscribeToPendingRequests, updateRequestStatus } from '@/src/services/requestService';
import { subscribeToUsers, approveUser, deleteUser } from '@/src/services/userService';
import { findAssignment, deleteShiftAssignment, createShiftAssignment } from '@/src/services/scheduleService';
import { AppTooltip } from '@/src/components';

import { subscribeToAdminSwapRequests, approveSwapByAdmin, rejectSwapByAdmin } from '@/src/services/swapService';
import { SwapRequest } from '@/src/types';

type TabValue = 'shift_requests' | 'user_requests' | 'swap_requests';

export default function RequestsScreen() {
    const theme = useTheme();
    const { user: currentUser, isAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState<TabValue>('shift_requests');

    // Shift Requests State
    const [requests, setRequests] = useState<ShiftRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);

    // User Requests State
    const [users, setUsers] = useState<User[]>([]);
    const pendingUsers = users.filter(u => !u.isApproved && u.role === 'user');
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Swap Requests State - Removed, managed by SwapRequestList component
    // const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
    // const [loadingSwaps, setLoadingSwaps] = useState(true);

    // Shift Response Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ShiftRequest | null>(null);
    const [adminResponse, setAdminResponse] = useState('');
    const [responding, setResponding] = useState(false);

    // User Approval Modal
    const [approvalModalVisible, setApprovalModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedStaffRole, setSelectedStaffRole] = useState<StaffRole>('saglikci');
    const [selectedRotationGroup, setSelectedRotationGroup] = useState<RotationGroup>('A');

    const [approving, setApproving] = useState(false);


    // const [processingSwap, setProcessingSwap] = useState(false); // Removed

    useEffect(() => {
        const unsubscribeRequests = subscribeToPendingRequests(
            (data) => {
                setRequests(data);
                setLoadingRequests(false);
            },
            (error) => {
                console.error(error);
                setLoadingRequests(false);
            }
        );

        const unsubscribeUsers = subscribeToUsers(
            (updatedUsers) => {
                setUsers(updatedUsers);
                setLoadingUsers(false);
            },
            (error) => {
                console.error(error);
                setLoadingUsers(false);
            }
        );

        // Swap subscription removed
        // const unsubscribeSwaps = subscribeToAdminSwapRequests((data) => {
        //     setSwapRequests(data);
        //     setLoadingSwaps(false);
        // });

        return () => {
            unsubscribeRequests();
            unsubscribeUsers();
            // unsubscribeSwaps(); // Removed
        };
    }, []);

    // --- Shift Request Handlers ---

    const openResponseModal = (request: ShiftRequest) => {
        setSelectedRequest(request);
        setAdminResponse('');
        setModalVisible(true);
    };

    const handleResponse = async (request: ShiftRequest, status: 'approved' | 'rejected') => {
        if (!request) return;

        setResponding(true);
        try {
            // Eğer onaylandıysa ve bu bir vardiya değişikliği isteğiyse otomatik işlem yap
            if (status === 'approved' && request.shiftSlot) {
                const { userId, userName, userStaffRole, requestedDate, shiftSlot, action, targetDate } = request;

                if (action === 'remove') {
                    // 1. Mevcut vardiyayı bul
                    const assignment = await findAssignment(userId, requestedDate, shiftSlot);

                    if (assignment) {
                        // 2. Vardiyayı sil
                        await deleteShiftAssignment(assignment.id);

                        // 3. Eğer taşıma isteği ise (targetDate varsa), yeni vardiya oluştur
                        if (targetDate) {
                            await createShiftAssignment(
                                targetDate,
                                shiftSlot,
                                userId,
                                userName,
                                userStaffRole
                            );
                        }
                    } else {
                        // Vardiya bulunamadıysa bile isteği onayla ama uyar
                        console.warn('Silinecek vardiya bulunamadı');
                    }
                } else if (action === 'add') {
                    // Ekleme isteği
                    await createShiftAssignment(
                        requestedDate,
                        shiftSlot,
                        userId,
                        userName,
                        userStaffRole
                    );
                }
            }

            await updateRequestStatus(request.id, status, adminResponse);
            setModalVisible(false);
            Alert.alert(
                'Başarılı',
                status === 'approved' ? 'İstek onaylandı ve vardiya güncellendi' : 'İstek reddedildi'
            );
        } catch (error: any) {
            console.error(error);
            Alert.alert('Hata', error.message || 'İşlem sırasında bir hata oluştu');
        } finally {
            setResponding(false);
        }
    };

    // --- User Request Handlers ---

    const handleOpenApprovalModal = (user: User) => {
        setSelectedUser(user);
        setSelectedStaffRole('saglikci');
        setSelectedRotationGroup('A');
        setApprovalModalVisible(true);
    };

    const handleApproveUser = async () => {
        if (!selectedUser) return;

        setApproving(true);
        try {
            await approveUser(selectedUser.id, selectedStaffRole, selectedRotationGroup);
            setApprovalModalVisible(false);
            Alert.alert('Başarılı', `${selectedUser.fullName} onaylandı`);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Kullanıcı onaylanamadı');
        } finally {
            setApproving(false);
        }
    };

    const handleDeleteUser = (user: User) => {
        Alert.alert(
            'Kullanıcıyı Sil',
            `${user.fullName} kullanıcısını silmek istediğinize emin misiniz?`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteUser(user.id);
                        } catch (error: any) {
                            Alert.alert('Hata', error.message);
                        }
                    }
                }
            ]
        );
    };

    const getRequestTypeInfo = (type: ShiftRequest['type']) => {
        return REQUEST_TYPES.find(t => t.id === type) || REQUEST_TYPES[0];
    };

    const getStaffRoleInfo = (role: ShiftRequest['userStaffRole'] | undefined) => {
        return STAFF_ROLES.find(r => r.id === role) || STAFF_ROLES[0];
    };

    if (!isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text>Bu sayfayı görüntüleme yetkiniz yok.</Text>
            </View>
        );
    }

    // --- SWAP REQUEST HANDLERS (REMOVED) ---
    // The old swap handlers and render logic have been removed.
    // The SwapRequestList component now handles this functionality.

    const renderShiftRequest = ({ item }: { item: ShiftRequest }) => {
        const typeInfo = getRequestTypeInfo(item.type);
        const roleInfo = getStaffRoleInfo(item.userStaffRole);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                            {item.userName}
                        </Text>
                        <Chip
                            compact
                            style={{ backgroundColor: roleInfo.color + '20' }}
                            textStyle={{ color: roleInfo.color }}
                        >
                            {roleInfo.labelTr}
                        </Chip>
                    </View>
                    <Chip icon={typeInfo.icon} compact>
                        {typeInfo.labelTr}
                    </Chip>
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={styles.cardBody}>
                    <View style={styles.dateRow}>
                        <IconButton icon="calendar" size={16} style={{ margin: 0 }} />
                        <Text variant="bodyMedium">
                            {format(new Date(item.requestedDate), 'd MMMM yyyy', { locale: tr })}
                        </Text>
                        {item.targetDate && (
                            <>
                                <IconButton icon="arrow-right" size={16} style={{ margin: 0 }} />
                                <Text variant="bodyMedium">
                                    {format(new Date(item.targetDate), 'd MMMM yyyy', { locale: tr })}
                                </Text>
                            </>
                        )}
                    </View>

                    {/* Action Badge - Add or Remove */}
                    {item.action && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
                            <Chip
                                icon={item.action === 'add' ? 'plus-circle' : 'minus-circle'}
                                style={{
                                    backgroundColor: item.action === 'add' ? '#dcfce7' : '#fee2e2',
                                }}
                                textStyle={{
                                    color: item.action === 'add' ? '#16a34a' : '#dc2626',
                                    fontWeight: 'bold'
                                }}
                            >
                                {item.action === 'add' ? 'Vardiyaya Girmek İstiyor' : 'Vardiyadan Çıkmak İstiyor'}
                            </Chip>
                        </View>
                    )}

                    {/* Shift Slot Badge */}
                    {item.shiftSlot && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Chip
                                icon="clock-outline"
                                compact
                                style={{
                                    backgroundColor: '#f0f9ff',
                                }}
                                textStyle={{ color: '#0369a1' }}
                            >
                                {item.shiftSlot}
                            </Chip>
                        </View>
                    )}

                    {item.targetUserName && (
                        <View style={styles.dateRow}>
                            <IconButton icon="account-switch" size={16} style={{ margin: 0 }} />
                            <Text variant="bodyMedium">
                                Takas: {item.targetUserName}
                            </Text>
                        </View>
                    )}

                    <Text variant="bodyMedium" style={styles.message}>
                        "{item.message}"
                    </Text>

                    <Text variant="labelSmall" style={{ color: theme.colors.secondary }}>
                        {format(new Date(item.createdAt), 'd MMM yyyy HH:mm', { locale: tr })}
                    </Text>
                </View>

                <View style={styles.cardActions}>
                    <AppTooltip title="İsteği Reddet" style={{ flex: 1, marginRight: 8 }}>
                        <Button
                            mode="outlined"
                            textColor={theme.colors.error}
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    if (confirm('Bu isteği reddetmek istediğinize emin misiniz?')) {
                                        setSelectedRequest(item);
                                        handleResponse(item, 'rejected');
                                    }
                                } else {
                                    Alert.alert('Reddet', 'Emin misiniz?', [
                                        { text: 'İptal', style: 'cancel' },
                                        {
                                            text: 'Reddet',
                                            style: 'destructive',
                                            onPress: () => {
                                                setSelectedRequest(item);
                                                handleResponse(item, 'rejected');
                                            }
                                        }
                                    ]);
                                }
                            }}
                            style={{ width: '100%' }}
                        >
                            Reddet
                        </Button>
                    </AppTooltip>
                    <AppTooltip title="İsteği Onayla" style={{ flex: 1 }}>
                        <Button
                            mode="contained"
                            onPress={() => {
                                setSelectedRequest(item);
                                handleResponse(item, 'approved');
                            }}
                            style={{ width: '100%' }}
                        >
                            Onayla
                        </Button>
                    </AppTooltip>
                </View>
            </View>
        );
    };

    const renderPendingUser = ({ item }: { item: User }) => {
        return (
            <View style={styles.userCard}>
                <View style={styles.userInfo}>
                    <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                        {item.fullName}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                        {item.email}
                    </Text>
                    <Chip
                        style={[styles.statusChip, { backgroundColor: '#fef3c7' }]}
                        textStyle={{ color: '#b45309', fontSize: 12 }}
                        compact
                    >
                        Onay Bekliyor
                    </Chip>
                </View>
                <View style={styles.actions}>
                    <AppTooltip title="Kullanıcıyı Onayla" style={{ marginRight: 8 }}>
                        <Button
                            mode="contained"
                            onPress={() => handleOpenApprovalModal(item)}
                            compact
                            style={{ backgroundColor: '#22c55e' }}
                        >
                            Onayla
                        </Button>
                    </AppTooltip>
                    <AppTooltip title="Kullanıcıyı Sil">
                        <IconButton
                            icon="delete"
                            iconColor={theme.colors.error}
                            size={20}
                            onPress={() => handleDeleteUser(item)}
                        />
                    </AppTooltip>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    İstekler
                </Text>
                {(requests.length > 0 || pendingUsers.length > 0) && (
                    <Chip icon="bell-ring" style={{ backgroundColor: theme.colors.errorContainer }}>
                        Toplam {requests.length + pendingUsers.length}
                    </Chip>
                )}
            </View>

            <View style={styles.tabContainer}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as TabValue)}
                    buttons={[
                        { value: 'shift_requests', label: 'İzin/Vardiya' },
                        { value: 'user_requests', label: `Kayıt (${pendingUsers.length})` },
                        { value: 'swap_requests', label: 'Takas' },
                    ]}
                    style={{ marginBottom: 16 }}
                />
            </View>

            {loadingRequests || loadingUsers ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <>
                    {/* SWAP REQUESTS (NEW COMPONENT) */}
                    {activeTab === 'swap_requests' && (
                        <SwapRequestList />
                    )}

                    {/* SHIFT REQUESTS (LEGACY) */}
                    {activeTab === 'shift_requests' && (
                        requests.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <IconButton icon="calendar-check" size={48} iconColor={theme.colors.secondary} />
                                <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                                    Bekleyen vardiya isteği yok
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={requests}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                renderItem={renderShiftRequest}
                            />
                        )
                    )}

                    {/* USER REQUESTS (LEGACY) */}
                    {activeTab === 'user_requests' && (
                        pendingUsers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <IconButton icon="account-check" size={48} iconColor={theme.colors.secondary} />
                                <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                                    Bekleyen kayıt isteği yok
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={pendingUsers}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                renderItem={renderPendingUser}
                            />
                        )
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 64,
        gap: 16
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    tabContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
        gap: 12
    },
    card: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    userInfo: {
        flex: 1,
        gap: 4,
    },
    cardBody: {
        gap: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    message: {
        fontStyle: 'italic',
        backgroundColor: '#f8fafc',
        padding: 8,
        borderRadius: 8,
    },
    cardActions: {
        flexDirection: 'row',
        marginTop: 16,
    },
    modalContent: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSurface: {
        width: '100%',
        maxWidth: 400,
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    userPreview: {
        padding: 12,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    radioItem: {
        paddingVertical: 4,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        cursor: 'pointer'
    },
    statusChip: {
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
