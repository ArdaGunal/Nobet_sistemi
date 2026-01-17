/**
 * Hızlı Nöbet Ekle Screen (Admin Only)
 * 
 * Quick shift assignment with calendar popup and easy selection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
    Text,
    useTheme,
    Surface,
    ActivityIndicator,
    Chip,
    IconButton,
    Portal,
    Modal
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar, Clock, User as UserIcon, Check } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import { createShiftAssignment, deleteShiftAssignment, subscribeToDateRange, cleanupOldShifts } from '@/src/services/scheduleService';
import { subscribeToUsers } from '@/src/services/userService';
import { ShiftAssignment, User, ShiftSlot, StaffRole, SHIFT_SLOTS, STAFF_ROLES } from '@/src/types';
import { cleanupSwapRequests } from '@/src/services/swapService';
import { cleanupOldAnnouncements } from '@/src/services/announcementService';
import { cleanupOldMessages } from '@/src/services/chatService';

export default function AdminScreen() {
    const theme = useTheme();
    const { user: currentUser, isAdmin } = useAuth();

    // State
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<ShiftSlot>('08:30-16:30');
    const [selectedRole, setSelectedRole] = useState<StaffRole>('saglikci');

    const [users, setUsers] = useState<User[]>([]);
    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(true);

    // Calendar modal
    const [calendarVisible, setCalendarVisible] = useState(false);

    // Success modal
    const [successVisible, setSuccessVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Get month boundaries
    const monthStart = useMemo(() => format(startOfMonth(currentMonth), 'yyyy-MM-dd'), [currentMonth]);
    const monthEnd = useMemo(() => format(endOfMonth(currentMonth), 'yyyy-MM-dd'), [currentMonth]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start, end });

        const firstDayOfWeek = start.getDay();
        const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        return { days, paddingDays };
    }, [currentMonth]);


    // Load users
    useEffect(() => {
        const unsubscribe = subscribeToUsers((data) => {
            // Fix: Explicitly include admins/super_admins even if isApproved is undefined/false
            setUsers(data.filter(u => u.isApproved || u.role === 'admin' || u.role === 'super_admin'));
            setUsersLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Load assignments for the month
    useEffect(() => {
        const unsubscribe = subscribeToDateRange(
            monthStart,
            monthEnd,
            (data) => setAssignments(data),
            (error) => console.error(error)
        );
        return () => unsubscribe();
    }, [monthStart, monthEnd]);

    // Filter users by selected role
    const filteredUsers = useMemo(() => {
        return users.filter(u => u.staffRole === selectedRole);
    }, [users, selectedRole]);

    // Get assignments for selected date and slot
    const selectedDateAssignments = useMemo(() => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return assignments.filter(a => a.date === dateStr && a.shiftSlot === selectedSlot);
    }, [assignments, selectedDate, selectedSlot]);

    // Check if a user is already assigned
    const isUserAssigned = (userId: string) => {
        return selectedDateAssignments.some(a => a.userId === userId);
    };

    // Navigate months
    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
    };

    // Select date and close modal
    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
        setCalendarVisible(false);
    };

    // Handle quick add
    const handleQuickAdd = async (user: User) => {
        if (isUserAssigned(user.id)) {
            Alert.alert('Uyarı', `${user.fullName} bu vardiyaya zaten atanmış.`);
            return;
        }

        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            await createShiftAssignment(
                dateStr,
                selectedSlot,
                user.id,
                user.fullName,
                user.staffRole || 'saglikci'
            );
            setSuccessMessage(`${user.fullName} eklendi`);
            setSuccessVisible(true);
            setTimeout(() => setSuccessVisible(false), 1500);
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Nöbet eklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    // Handle remove
    const handleRemove = async (assignment: ShiftAssignment) => {
        try {
            await deleteShiftAssignment(assignment.id);
        } catch (error: any) {
            Alert.alert('Hata', error.message);
        }
    };

    // Get day count for calendar
    const getDayAssignmentCount = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return assignments.filter(a => a.date === dateStr).length;
    };

    if (!isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text>Bu sayfayı görüntüleme yetkiniz yok.</Text>
            </View>
        );
    }

    const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                        Hızlı Nöbet Ekle
                    </Text>
                </View>

                {/* Date Selector - Compact */}
                <TouchableOpacity onPress={() => setCalendarVisible(true)}>
                    <Surface style={styles.dateSelector} elevation={1}>
                        <Calendar size={24} color={theme.colors.primary} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text variant="bodySmall" style={{ color: '#6b7280' }}>Seçili Tarih</Text>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                {format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                            </Text>
                        </View>
                        <IconButton icon="chevron-down" size={20} />
                    </Surface>
                </TouchableOpacity>

                {/* Shift Slot Selection */}
                <View style={styles.slotSelector}>
                    {SHIFT_SLOTS.map(slot => (
                        <TouchableOpacity
                            key={slot.id}
                            style={[
                                styles.slotButton,
                                { borderColor: slot.color },
                                selectedSlot === slot.id && { backgroundColor: slot.color }
                            ]}
                            onPress={() => setSelectedSlot(slot.id)}
                        >
                            <Text style={[
                                styles.slotButtonText,
                                { color: selectedSlot === slot.id ? '#fff' : slot.color }
                            ]}>
                                {slot.labelTr}
                            </Text>
                            <Text style={[
                                styles.slotTimeText,
                                { color: selectedSlot === slot.id ? '#fff' : '#6b7280' }
                            ]}>
                                {slot.id}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Currently Assigned */}
                {selectedDateAssignments.length > 0 && (
                    <Surface style={styles.assignedSection} elevation={0}>
                        <Text variant="labelMedium" style={{ marginBottom: 8, color: '#6b7280' }}>
                            Bu Vardiyada ({selectedDateAssignments.length}):
                        </Text>
                        <View style={styles.assignedList}>
                            {selectedDateAssignments.map(a => (
                                <Chip
                                    key={a.id}
                                    style={styles.assignedChip}
                                    onClose={() => handleRemove(a)}
                                    closeIcon="close"
                                >
                                    {a.userName}
                                </Chip>
                            ))}
                        </View>
                    </Surface>
                )}

                {/* Role Selection */}
                <View style={styles.roleSelector}>
                    {STAFF_ROLES.map(role => (
                        <Chip
                            key={role.id}
                            selected={selectedRole === role.id}
                            onPress={() => setSelectedRole(role.id)}
                            style={[
                                styles.roleChip,
                                selectedRole === role.id && { backgroundColor: role.color }
                            ]}
                            textStyle={{ color: selectedRole === role.id ? '#fff' : '#374151' }}
                        >
                            {role.labelTr}
                        </Chip>
                    ))}
                </View>

                {/* User List for Quick Add */}
                <Surface style={styles.userListCard} elevation={1}>
                    <Text variant="titleSmall" style={{ marginBottom: 12, fontWeight: 'bold' }}>
                        {STAFF_ROLES.find(r => r.id === selectedRole)?.labelTr} Listesi
                    </Text>

                    {usersLoading ? (
                        <ActivityIndicator />
                    ) : filteredUsers.length === 0 ? (
                        <Text style={{ color: '#9ca3af', textAlign: 'center', padding: 16 }}>
                            Bu rolde onaylı personel bulunamadı.
                        </Text>
                    ) : (
                        filteredUsers.map(user => {
                            const assigned = isUserAssigned(user.id);
                            return (
                                <TouchableOpacity
                                    key={user.id}
                                    style={[
                                        styles.userItem,
                                        assigned && styles.userItemAssigned
                                    ]}
                                    onPress={() => !assigned && handleQuickAdd(user)}
                                    disabled={loading || assigned}
                                >
                                    <View style={styles.userInfo}>
                                        <UserIcon size={18} color={assigned ? '#9ca3af' : '#374151'} />
                                        <Text style={[
                                            styles.userName,
                                            assigned && { color: '#9ca3af' }
                                        ]}>
                                            {user.fullName}
                                        </Text>
                                    </View>
                                    {assigned ? (
                                        <View style={styles.assignedBadge}>
                                            <Check size={14} color="#22c55e" />
                                            <Text style={{ color: '#22c55e', fontSize: 12, marginLeft: 4 }}>Atandı</Text>
                                        </View>
                                    ) : (
                                        <IconButton
                                            icon="plus"
                                            size={20}
                                            iconColor={theme.colors.primary}
                                            style={{ margin: 0 }}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    )}
                </Surface>
            </ScrollView>

            {/* Calendar Modal */}
            <Portal>
                <Modal visible={calendarVisible} onDismiss={() => setCalendarVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Surface style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <IconButton icon="chevron-left" onPress={() => navigateMonth('prev')} size={20} />
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                            </Text>
                            <IconButton icon="chevron-right" onPress={() => navigateMonth('next')} size={20} />
                        </View>

                        <View style={styles.weekDaysRow}>
                            {weekDays.map(day => (
                                <Text key={day} style={styles.weekDayText}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                                <View key={`pad-${i}`} style={styles.dayCell} />
                            ))}

                            {calendarDays.days.map(day => {
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentDay = isToday(day);
                                const assignmentCount = getDayAssignmentCount(day);

                                return (
                                    <TouchableOpacity
                                        key={day.toISOString()}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.selectedDayCell,
                                            isCurrentDay && !isSelected && styles.todayCell
                                        ]}
                                        onPress={() => handleSelectDate(day)}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            isSelected && styles.selectedDayText,
                                            isCurrentDay && !isSelected && styles.todayText
                                        ]}>
                                            {format(day, 'd')}
                                        </Text>
                                        {assignmentCount > 0 && (
                                            <View style={[styles.dayBadge, isSelected && { backgroundColor: '#fff' }]}>
                                                <Text style={[styles.dayBadgeText, isSelected && { color: theme.colors.primary }]}>
                                                    {assignmentCount}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Surface>
                </Modal>
            </Portal>

            {/* Success Toast */}
            <Portal>
                <Modal visible={successVisible} dismissable={false} contentContainerStyle={styles.successModal}>
                    <Surface style={styles.successCard}>
                        <View style={styles.successIcon}>
                            <Check size={24} color="#22c55e" />
                        </View>
                        <Text style={{ fontWeight: 'bold', marginTop: 8 }}>{successMessage}</Text>
                    </Surface>
                </Modal>
            </Portal>
        </SafeAreaView>
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
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 16,
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    slotSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    slotButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center',
    },
    slotButtonText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    slotTimeText: {
        fontSize: 9,
        marginTop: 2,
    },
    assignedSection: {
        padding: 12,
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        marginBottom: 12,
    },
    assignedList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    assignedChip: {
        backgroundColor: '#dcfce7',
    },
    roleSelector: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    roleChip: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    userListCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 8,
        marginBottom: 8,
    },
    userItemAssigned: {
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '500',
    },
    assignedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalContent: {
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarCard: {
        padding: 16,
        borderRadius: 16,
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 360,
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    weekDaysRow: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    selectedDayCell: {
        backgroundColor: '#6366f1',
        borderRadius: 8,
    },
    todayCell: {
        borderWidth: 2,
        borderColor: '#6366f1',
        borderRadius: 8,
    },
    dayText: {
        fontSize: 14,
        color: '#374151',
    },
    selectedDayText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    todayText: {
        color: '#6366f1',
        fontWeight: 'bold',
    },
    dayBadge: {
        position: 'absolute',
        bottom: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#6366f1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayBadgeText: {
        fontSize: 9,
        color: '#fff',
        fontWeight: 'bold',
    },
    successModal: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    successCard: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
    },
    successIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
