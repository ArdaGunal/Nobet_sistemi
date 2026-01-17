/**
 * Dashboard Screen
 * 
 * Displays the list of shift assignments for all users.
 * Uses the schedule collection (same as admin panel).
 * Personnel can request shifts via FAB button.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, ActivityIndicator, FAB, Chip, Portal, Modal, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth, addDays, subDays, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Moon, Sun, Sunset, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';

import { subscribeToDateRange } from '@/src/services/scheduleService';
import { createRequest, subscribeToUserRequests } from '@/src/services/requestService';
import { ShiftAssignment, ShiftRequest, SHIFT_SLOTS, STAFF_ROLES, ShiftSlot } from '@/src/types';
import { DatePicker } from '@/src/components';
import { useAuth } from '@/context/AuthContext';

import { useRouter } from 'expo-router';
import { subscribeToAnnouncements } from '@/src/services/announcementService';
import { createSwapRequest, subscribeToSwapRequests } from '@/src/services/swapService';
import { SwapRequest } from '@/src/types';
import { SwapRequestCard } from '@/src/components/SwapRequestCard';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, isAdmin } = useAuth();
    const { width } = useWindowDimensions();
    const isMobile = width < 500;

    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);

    // Request Modal States (2-step flow: select shift -> choose action)
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [modalStep, setModalStep] = useState<'select' | 'action'>('select');
    const [selectedShift, setSelectedShift] = useState<ShiftAssignment | null>(null);
    const [requestType, setRequestType] = useState<'cancel' | 'swap'>('cancel');
    const [swapTargetShift, setSwapTargetShift] = useState<ShiftAssignment | null>(null);
    const [availableSwapShifts, setAvailableSwapShifts] = useState<ShiftAssignment[]>([]);
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    const [requestMessage, setRequestMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // User's pending requests
    const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
    const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);

    // Get date range for subscription (current month)
    const monthStart = useMemo(() => format(startOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate]);
    const monthEnd = useMemo(() => format(endOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate]);

    // Track unread announcements
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToAnnouncements((data) => {
            const unread = data.filter(a => !a.readBy?.includes(user.id));
            setUnreadAnnouncementsCount(unread.length);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        setLoading(true);

        const unsubscribe = subscribeToDateRange(
            monthStart,
            monthEnd,
            (data) => {
                setAssignments(data);
                setLoading(false);
                setRefreshing(false);
            },
            (error) => {
                console.error(error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        return () => unsubscribe();
    }, [monthStart, monthEnd]);

    // Subscribe to user's own requests
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToUserRequests(user.id, (requests) => {
            // Filter to only show pending requests of type 'preference'
            setMyRequests(requests.filter(r => r.type === 'preference' && r.status === 'pending'));
        });

        return () => unsubscribe();
    }, [user]);

    // Subscribe to incoming swap requests
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToSwapRequests(user.id, (data) => {
            const pending = data.filter(r => r.status === 'pending_user' && r.expiresAt > Date.now());
            setSwapRequests(pending);
        });
        return () => unsubscribe();
    }, [user]);

    // Filter assignments for selected date
    const filteredAssignments = useMemo(() => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return assignments
            .filter(a => a.date === dateStr)
            .sort((a, b) => a.shiftSlot.localeCompare(b.shiftSlot));
    }, [assignments, selectedDate]);

    // Group by shift slot
    const groupedAssignments = useMemo(() => {
        const groups: Record<string, ShiftAssignment[]> = {};
        SHIFT_SLOTS.forEach(slot => {
            groups[slot.id] = filteredAssignments.filter(a => a.shiftSlot === slot.id);
        });
        return groups;
    }, [filteredAssignments]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
    };

    const getSlotIcon = (slotId: string, color: string) => {
        switch (slotId) {
            case '00:30-08:30':
                return <Moon size={20} color={color} />;
            case '08:30-16:30':
                return <Sun size={20} color={color} />;
            case '16:30-00:30':
                return <Sunset size={20} color={color} />;
            default:
                return <Sun size={20} color={color} />;
        }
    };

    const getRoleColor = (role: string) => {
        return STAFF_ROLES.find(r => r.id === role)?.color || '#6b7280';
    };

    // Get user's own future shifts
    const myShifts = useMemo(() => {
        if (!user) return [];
        const today = format(new Date(), 'yyyy-MM-dd');
        return assignments
            .filter(a => a.userId === user.id && a.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date) || a.shiftSlot.localeCompare(b.shiftSlot));
    }, [assignments, user]);

    // Calculate available swap shifts when in swap mode
    useEffect(() => {
        if (requestType !== 'swap' || !user?.staffRole) return;

        const dateStr = format(targetDate, 'yyyy-MM-dd');
        const potential = assignments.filter(a =>
            a.date === dateStr &&
            a.staffRole === user.staffRole &&
            a.userId !== user.id
        );
        setAvailableSwapShifts(potential);

        // Reset target selection if list changes and selected isn't in it
        if (swapTargetShift && !potential.find(p => p.id === swapTargetShift.id)) {
            setSwapTargetShift(null);
        }
    }, [requestType, targetDate, assignments, user, swapTargetShift]);

    // Request Modal Functions
    const openRequestModal = () => {
        setModalStep('select');
        setSelectedShift(null);
        setRequestType('cancel');
        setTargetDate(addDays(new Date(), 1));
        setRequestMessage('');
        setRequestModalVisible(true);
    };

    const handleSelectShift = (shift: ShiftAssignment) => {
        setSelectedShift(shift);
        setModalStep('action');
    };

    const handleSubmitRequest = async () => {
        if (!user || !user.staffRole || !selectedShift) return;

        setSubmitting(true);
        try {
            const slotLabel = SHIFT_SLOTS.find(s => s.id === selectedShift.shiftSlot)?.labelTr;
            let message = '';
            let action: 'add' | 'remove' = 'remove';

            if (requestType === 'cancel') {
                message = `${format(new Date(selectedShift.date), 'd MMMM', { locale: tr })} ${slotLabel} vardiyamı iptal etmek istiyorum${requestMessage ? '. Sebep: ' + requestMessage : ''}`;

                await createRequest(
                    user.id,
                    user.fullName,
                    user.staffRole,
                    'preference',
                    selectedShift.date,
                    message,
                    action,
                    selectedShift.shiftSlot,
                    undefined
                );

            } else if (requestType === 'swap') {
                if (!swapTargetShift) {
                    alert('Lütfen takas yapacağınız kişiyi seçin.');
                    setSubmitting(false);
                    return;
                }

                // createSwapRequest already handles logic. 
                // We pass minimal user info as expected by service.
                // Assuming availableSwapShifts come from assignments which have userId and userName.
                await createSwapRequest(
                    { id: user.id, fullName: user.fullName },
                    selectedShift,
                    { id: swapTargetShift.userId, fullName: swapTargetShift.userName },
                    swapTargetShift
                );
            }
            setRequestModalVisible(false);
        } catch (error: any) {
            console.error('Request failed:', error);
            // Show error to user
            alert('İstek gönderilemedi: ' + (error?.message || 'Bilinmeyen hata'));
        } finally {
            setSubmitting(false);
        }
    };

    const renderSlotSection = (slotId: string) => {
        const slot = SHIFT_SLOTS.find(s => s.id === slotId);
        const slotAssignments = groupedAssignments[slotId] || [];

        if (!slot) return null;

        return (
            <Surface key={slotId} style={styles.slotCard} elevation={1}>
                <View style={[styles.slotHeader, { backgroundColor: slot.color, justifyContent: 'space-between' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {getSlotIcon(slotId, '#fff')}
                        <Text style={styles.slotTitle}>{slot.labelTr} ({slotId})</Text>
                    </View>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{slotAssignments.length} Personel</Text>
                </View>

                <View style={styles.slotContent}>
                    {slotAssignments.length === 0 ? (
                        <Text style={styles.emptyText}>Bu vardiyada atama yok</Text>
                    ) : (
                        slotAssignments.map(assignment => (
                            <View key={assignment.id} style={styles.assignmentItem}>
                                <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(assignment.staffRole) }]} />
                                <View style={styles.assignmentInfo}>
                                    <Text style={styles.assignmentName}>{assignment.userName}</Text>
                                    <Text style={[styles.assignmentRole, { color: getRoleColor(assignment.staffRole) }]}>
                                        {STAFF_ROLES.find(r => r.id === assignment.staffRole)?.labelTr}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </Surface>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Compact Date Selector */}
            <View style={styles.dateHeader}>
                <DatePicker date={selectedDate} onChange={handleDateChange} />
                <Text variant="bodySmall" style={{ color: theme.colors.secondary, marginTop: 4 }}>
                    {format(selectedDate, 'EEEE', { locale: tr })}
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={SHIFT_SLOTS}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => renderSlotSection(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListFooterComponent={
                        <View style={{ padding: 16, backgroundColor: '#fff', marginTop: 8, marginBottom: 24, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                                Toplam Personel: {filteredAssignments.length}
                            </Text>
                            <View style={[styles.roleSummary, { justifyContent: 'center', marginTop: 8 }]}>
                                {STAFF_ROLES.map(role => {
                                    const count = filteredAssignments.filter(a => a.staffRole === role.id).length;
                                    return count > 0 ? (
                                        <Chip
                                            key={role.id}
                                            compact
                                            style={[styles.summaryChip, { backgroundColor: role.color }]}
                                            textStyle={{ color: '#fff', fontSize: 11 }}
                                        >
                                            {count} {role.labelTr}
                                        </Chip>
                                    ) : null;
                                })}
                            </View>
                        </View>
                    }
                    ListHeaderComponent={
                        <View>
                            {/* Announcements Banner */}
                            {/* Announcements Banner */}
                            {user && unreadAnnouncementsCount > 0 && (
                                <Surface style={{ margin: 16, marginBottom: 8, padding: 12, borderRadius: 8, backgroundColor: '#fef2f2', borderLeftWidth: 4, borderLeftColor: '#ef4444' }} elevation={2}>
                                    <TouchableOpacity onPress={() => router.push('/(tabs)/announcements')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                                            <Text style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                                                {unreadAnnouncementsCount} Yeni Duyuru
                                            </Text>
                                        </View>
                                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Oku →</Text>
                                    </TouchableOpacity>
                                </Surface>
                            )}

                            {/* Swap Requests */}
                            {swapRequests.length > 0 && (
                                <View>
                                    {swapRequests.map(req => (
                                        <SwapRequestCard key={req.id} request={req} currentUserId={user!.id} />
                                    ))}
                                </View>
                            )}

                            {/* User's Pending Requests */}
                            {myRequests.length > 0 && (
                                <Surface style={styles.pendingRequestsCard} elevation={1}>
                                    <Text variant="titleSmall" style={{ marginBottom: 8, color: theme.colors.primary }}>
                                        📝 Bekleyen İsteklerim
                                    </Text>
                                    {myRequests.map(req => (
                                        <View key={req.id} style={styles.pendingRequestItem}>
                                            <Text style={{ fontSize: 13 }}>
                                                {format(new Date(req.requestedDate), 'd MMM', { locale: tr })} - {req.message}
                                            </Text>
                                            <Chip compact style={{ backgroundColor: '#fef3c7' }} textStyle={{ fontSize: 10, color: '#92400e' }}>
                                                Bekliyor
                                            </Chip>
                                        </View>
                                    ))}
                                </Surface>
                            )}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                                Bu tarihte nöbet kaydı bulunamadı.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB for requesting shift - for all users with staffRole */}
            {user?.staffRole && (
                <FAB
                    icon={({ size, color }) => <Plus size={size} color={color} />}
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={openRequestModal}
                    label="Vardiyalarım"
                />
            )}

            {/* Request Modal - 2 Step Flow */}
            <Portal>
                <Modal
                    visible={requestModalVisible}
                    onDismiss={() => setRequestModalVisible(false)}
                    contentContainerStyle={[
                        styles.modalContainer,
                        {
                            backgroundColor: theme.colors.surface,
                            maxWidth: isMobile ? '95%' : 420,
                            alignSelf: 'center'
                        }
                    ]}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Step 1: Select Shift */}
                        {modalStep === 'select' && (
                            <>
                                <Text variant="titleLarge" style={{ marginBottom: 16, fontWeight: 'bold', textAlign: 'center' }}>
                                    📋 Vardiyalarım
                                </Text>
                                <Text variant="bodyMedium" style={{ color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
                                    Değişiklik yapmak isterseniz vardiyanızın üzerine tıklayın.
                                </Text>

                                {myShifts.length === 0 ? (
                                    <Surface style={{ padding: 24, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center' }} elevation={0}>
                                        <Text style={{ fontSize: 32, marginBottom: 12 }}>📭</Text>
                                        <Text variant="bodyMedium" style={{ color: '#92400e', textAlign: 'center' }}>
                                            Henüz size atanmış bir vardiya bulunmuyor.
                                        </Text>
                                    </Surface>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {myShifts.map(shift => {
                                            const slotInfo = SHIFT_SLOTS.find(s => s.id === shift.shiftSlot);
                                            return (
                                                <Surface
                                                    key={shift.id}
                                                    style={{
                                                        borderRadius: 12,
                                                        overflow: 'hidden',
                                                        borderWidth: 2,
                                                        borderColor: slotInfo?.color || '#e5e7eb'
                                                    }}
                                                    elevation={1}
                                                >
                                                    <Button
                                                        mode="text"
                                                        onPress={() => handleSelectShift(shift)}
                                                        contentStyle={{ justifyContent: 'flex-start', paddingVertical: 8 }}
                                                        style={{ borderRadius: 0 }}
                                                    >
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                            {getSlotIcon(shift.shiftSlot, slotInfo?.color || '#6b7280')}
                                                            <View>
                                                                <Text style={{ fontWeight: 'bold', fontSize: 15 }}>
                                                                    {format(new Date(shift.date), 'd MMMM yyyy', { locale: tr })}
                                                                </Text>
                                                                <Text style={{ color: slotInfo?.color, fontSize: 13 }}>
                                                                    {slotInfo?.labelTr} ({shift.shiftSlot})
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </Button>
                                                </Surface>
                                            );
                                        })}
                                    </View>
                                )}

                                <Button
                                    mode="outlined"
                                    onPress={() => setRequestModalVisible(false)}
                                    style={{ marginTop: 20 }}
                                >
                                    Kapat
                                </Button>
                            </>
                        )}

                        {/* Step 2: Choose Action */}
                        {modalStep === 'action' && selectedShift && (
                            <>
                                <Text variant="titleLarge" style={{ marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>
                                    ⚙️ Vardiya İşlemi
                                </Text>

                                {/* Selected Shift Info */}
                                <Surface style={{ padding: 16, borderRadius: 12, backgroundColor: '#f0f9ff', marginBottom: 16 }} elevation={0}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {getSlotIcon(selectedShift.shiftSlot, SHIFT_SLOTS.find(s => s.id === selectedShift.shiftSlot)?.color || '#6b7280')}
                                        <View>
                                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                                {format(new Date(selectedShift.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                                            </Text>
                                            <Text style={{ color: SHIFT_SLOTS.find(s => s.id === selectedShift.shiftSlot)?.color }}>
                                                {SHIFT_SLOTS.find(s => s.id === selectedShift.shiftSlot)?.labelTr} ({selectedShift.shiftSlot})
                                            </Text>
                                        </View>
                                    </View>
                                </Surface>

                                {/* Action Selection */}
                                <Text variant="labelLarge" style={{ marginBottom: 8 }}>Ne yapmak istiyorsunuz?</Text>
                                <View style={styles.actionSelectorContainer}>
                                    <Button
                                        mode={requestType === 'cancel' ? 'contained' : 'outlined'}
                                        onPress={() => setRequestType('cancel')}
                                        style={[styles.actionButton, requestType === 'cancel' && { backgroundColor: '#ef4444' }]}
                                        icon="close-circle"
                                        compact
                                    >
                                        Vardiyayı İptal Et
                                    </Button>
                                </View>
                                <Button
                                    mode={requestType === 'swap' ? 'contained' : 'outlined'}
                                    onPress={() => { setRequestType('swap'); setSwapTargetShift(null); }}
                                    style={[styles.actionButton, requestType === 'swap' && { backgroundColor: '#8b5cf6' }]}
                                    icon="account-switch"
                                    compact
                                >
                                    Takas Et
                                </Button>

                                {/* Target Date Selector (for swap) */}
                                {requestType === 'swap' && (
                                    <>
                                        <Text variant="labelLarge" style={{ marginBottom: 8, marginTop: 16 }}>
                                            Takas yapılacak tarih?
                                        </Text>
                                        <View style={styles.dateSelectorContainer}>
                                            <Button
                                                mode="outlined"
                                                onPress={() => setTargetDate(subDays(targetDate, 1))}
                                                compact
                                                style={styles.dateArrowButton}
                                            >
                                                ◀
                                            </Button>
                                            <View style={styles.dateDisplay}>
                                                <Calendar size={18} color={theme.colors.primary} />
                                                <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                                                    {format(targetDate, 'd MMMM yyyy', { locale: tr })}
                                                </Text>
                                            </View>
                                            <Button
                                                mode="outlined"
                                                onPress={() => setTargetDate(addDays(targetDate, 1))}
                                                compact
                                                style={styles.dateArrowButton}
                                            >
                                                ▶
                                            </Button>
                                        </View>
                                        <Text variant="bodySmall" style={{ color: '#6b7280', textAlign: 'center', marginBottom: 8 }}>
                                            {format(targetDate, 'EEEE', { locale: tr })}
                                        </Text>

                                        {/* Swap: List available users */}
                                        {requestType === 'swap' && (
                                            <View style={{ marginTop: 8 }}>
                                                <Text variant="labelLarge" style={{ marginBottom: 8 }}>Müsait Arkadaşlar ({availableSwapShifts.length})</Text>
                                                {availableSwapShifts.length === 0 ? (
                                                    <Text style={{ fontStyle: 'italic', color: '#6b7280', textAlign: 'center', padding: 10 }}>
                                                        Bu tarihte meslektaşınız yok veya veri yüklenemedi.
                                                    </Text>
                                                ) : (
                                                    availableSwapShifts.map(shift => (
                                                        <Surface
                                                            key={shift.id}
                                                            style={{
                                                                marginBottom: 8,
                                                                borderRadius: 8,
                                                                backgroundColor: swapTargetShift?.id === shift.id ? '#ede9fe' : '#f8fafc',
                                                                borderWidth: swapTargetShift?.id === shift.id ? 2 : 1,
                                                                borderColor: swapTargetShift?.id === shift.id ? '#8b5cf6' : '#e2e8f0'
                                                            }}
                                                        >
                                                            <TouchableOpacity onPress={() => setSwapTargetShift(shift)} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Text style={{ fontWeight: 'bold', color: '#64748b' }}>{shift.userName.charAt(0)}</Text>
                                                                </View>
                                                                <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontWeight: 'bold' }}>{shift.userName}</Text>
                                                                    <Text style={{ fontSize: 12, color: '#64748b' }}>{SHIFT_SLOTS.find(s => s.id === shift.shiftSlot)?.labelTr}</Text>
                                                                </View>
                                                                {swapTargetShift?.id === shift.id && (
                                                                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Text style={{ color: 'white', fontSize: 10 }}>✓</Text>
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        </Surface>
                                                    ))
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}

                                {/* Message Input */}
                                <Text variant="labelLarge" style={{ marginBottom: 8, marginTop: 8 }}>Sebep (İsteğe Bağlı)</Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Örn: Sağlık sorunu, aile işi..."
                                    value={requestMessage}
                                    onChangeText={setRequestMessage}
                                    multiline
                                    numberOfLines={2}
                                    style={{ marginBottom: 20 }}
                                />

                                {/* Action Buttons */}
                                <View style={styles.modalActions}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => setModalStep('select')}
                                        style={{ flex: 1 }}
                                    >
                                        ← Geri
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleSubmitRequest}
                                        loading={submitting}
                                        disabled={submitting}
                                        style={{ flex: 1, marginLeft: 12, backgroundColor: requestType === 'cancel' ? '#ef4444' : '#3b82f6' }}
                                    >
                                        {requestType === 'cancel' ? 'İptal İste' : 'Takas İste'}
                                    </Button>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </Modal>
            </Portal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    dateHeader: {
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100, // Extra space for FAB
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 24,
        alignItems: 'center',
    },
    summaryBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
        flexWrap: 'wrap',
        gap: 8,
    },
    roleSummary: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    summaryChip: {
        height: 24,
    },
    slotCard: {
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    slotHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
    },
    slotTitle: {
        flex: 1,
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    slotTime: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.9,
    },
    slotContent: {
        padding: 12,
    },
    emptyText: {
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8,
    },
    assignmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        marginBottom: 8,
    },
    roleIndicator: {
        width: 4,
        height: 32,
        borderRadius: 2,
        marginRight: 12,
    },
    assignmentInfo: {
        flex: 1,
    },
    assignmentName: {
        fontWeight: '600',
        fontSize: 15,
        color: '#1f2937',
    },
    assignmentRole: {
        fontSize: 12,
        marginTop: 2,
    },
    pendingRequestsCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fffbeb',
        borderLeftWidth: 4,
        borderLeftColor: '#f59e0b',
    },
    pendingRequestItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
    modalContainer: {
        margin: 16,
        padding: 24,
        borderRadius: 16,
        maxHeight: '90%',
    },
    dateSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        gap: 8,
    },
    dateArrowButton: {
        minWidth: 40,
    },
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    actionSelectorContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        borderRadius: 8,
    },
    slotSelectorContainer: {
        gap: 8,
    },
    slotButton: {
        borderRadius: 8,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
});
