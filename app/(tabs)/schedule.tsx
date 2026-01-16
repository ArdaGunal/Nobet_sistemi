/**
 * Atamalar (Schedule) Screen (Admin Only)
 * 
 * Weekly view for managing shift assignments with mini calendar popup.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
    Text,
    Surface,
    useTheme,
    IconButton,
    Portal,
    Modal,
    Button,
    Chip,
    ActivityIndicator,
    Divider
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    format,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isToday,
    isSameWeek
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Calendar } from 'lucide-react-native';

import { useAuth } from '@/context/AuthContext';
import {
    ShiftAssignment,
    ShiftSlot,
    StaffRole,
    User,
    DailyShift,
    SHIFT_SLOTS,
    STAFF_ROLES,
    SHIFT_REQUIREMENTS
} from '@/src/types';
import {
    subscribeToDateRange,
    createShiftAssignment,
    deleteShiftAssignment,
    generateMonthCalendar,
    populateCalendarWithAssignments,
    checkShiftRequirements
} from '@/src/services/scheduleService';
import { subscribeToUsers } from '@/src/services/userService';
import { AppTooltip } from '@/src/components';

// Format date to DD/MM/YYYY
const formatDateTR = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function ScheduleScreen() {
    const theme = useTheme();
    const { user: currentUser, isAdmin } = useAuth();
    const scrollViewRef = useRef<ScrollView>(null);

    // Current week state
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const today = new Date();
        return startOfWeek(today, { weekStartsOn: 1 }); // Monday
    });

    const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dayCardHeight, setDayCardHeight] = useState(0);
    const [targetDayIndex, setTargetDayIndex] = useState<number | null>(null);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSlot, setSelectedSlot] = useState<ShiftSlot>('08:30-16:30');
    const [selectedRole, setSelectedRole] = useState<StaffRole>('saglikci');

    // Delete modal state
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [assignmentToDelete, setAssignmentToDelete] = useState<ShiftAssignment | null>(null);

    // Calendar modal state
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

    // Week boundaries
    const weekStart = useMemo(() => format(currentWeekStart, 'yyyy-MM-dd'), [currentWeekStart]);
    const weekEnd = useMemo(() => format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'), [currentWeekStart]);

    // Week days
    const weekDays = useMemo(() => {
        const start = currentWeekStart;
        const end = endOfWeek(start, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentWeekStart]);

    // Calendar days for popup
    const calendarDays = useMemo(() => {
        const start = startOfMonth(calendarMonth);
        const end = endOfMonth(calendarMonth);
        const days = eachDayOfInterval({ start, end });
        const firstDayOfWeek = start.getDay();
        const paddingDays = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        return { days, paddingDays };
    }, [calendarMonth]);

    // Load assignments for current week + 2 weeks ahead
    useEffect(() => {
        const rangeEnd = format(endOfWeek(addWeeks(currentWeekStart, 2), { weekStartsOn: 1 }), 'yyyy-MM-dd');

        const unsubscribe = subscribeToDateRange(
            weekStart,
            rangeEnd,
            (data) => {
                setAssignments(data);
                setLoading(false);
            },
            (error) => {
                console.error(error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [weekStart]);

    // Load users
    useEffect(() => {
        const unsubscribe = subscribeToUsers((data) => setUsers(data.filter(u => u.isApproved)));
        return () => unsubscribe();
    }, []);

    // Filter users by role
    const filteredUsers = useMemo(() => {
        return users.filter(u => u.staffRole === selectedRole);
    }, [users, selectedRole]);

    // Get assignments for a specific day and slot
    const getSlotAssignments = (date: string, slot: ShiftSlot): ShiftAssignment[] => {
        return assignments.filter(a => a.date === date && a.shiftSlot === slot);
    };

    // Navigation
    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentWeekStart(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    };

    const goToToday = () => {
        const today = new Date();
        setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));

        // Calculate day index for today
        const dayOfWeek = today.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        setTargetDayIndex(dayIndex);
    };

    // Select date from calendar
    const handleSelectDate = (date: Date) => {
        const newWeekStart = startOfWeek(date, { weekStartsOn: 1 });
        setCurrentWeekStart(newWeekStart);

        // Calculate which day of the week (0=Mon, 6=Sun)
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0 format
        setTargetDayIndex(dayIndex);

        setCalendarVisible(false);
    };

    // Scroll to target day after render
    useEffect(() => {
        if (targetDayIndex !== null && !loading && dayCardHeight > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: targetDayIndex * dayCardHeight, animated: true });
                setTargetDayIndex(null);
            }, 100);
        }
    }, [targetDayIndex, loading, dayCardHeight]);

    // Open add modal
    const openAddModal = (date: string, slot: ShiftSlot) => {
        setSelectedDate(date);
        setSelectedSlot(slot);
        setModalVisible(true);
    };

    // Add assignment
    const handleAddAssignment = async (user: User) => {
        const existingAssignments = getSlotAssignments(selectedDate, selectedSlot);
        if (existingAssignments.some(a => a.userId === user.id)) {
            Alert.alert('Uyarı', `${user.fullName} bu vardiyaya zaten atanmış.`);
            return;
        }

        try {
            await createShiftAssignment(
                selectedDate,
                selectedSlot,
                user.id,
                user.fullName,
                user.staffRole || 'saglikci'
            );
            setModalVisible(false);
        } catch (error: any) {
            Alert.alert('Hata', error.message);
        }
    };

    // Delete handlers
    const handleDeleteClick = (assignment: ShiftAssignment) => {
        setAssignmentToDelete(assignment);
        setDeleteModalVisible(true);
    };

    const confirmDelete = async () => {
        if (assignmentToDelete) {
            try {
                await deleteShiftAssignment(assignmentToDelete.id);
                setDeleteModalVisible(false);
                setAssignmentToDelete(null);
            } catch (error: any) {
                Alert.alert('Hata', error.message);
            }
        }
    };

    const getRoleColor = (role: StaffRole) => {
        return STAFF_ROLES.find(r => r.id === role)?.color || '#6b7280';
    };

    // Check if current week includes today
    const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 });

    if (!isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text>Bu sayfayı görüntüleme yetkiniz yok.</Text>
            </View>
        );
    }

    const weekDayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            {/* Header */}
            <Surface style={styles.header} elevation={1}>
                <View style={styles.headerRow}>
                    <View style={styles.headerRow}>
                        <AppTooltip title="Bulunduğunuz haftaya gider" style={{ marginRight: 4 }}>
                            <Button
                                mode="contained-tonal"
                                onPress={goToToday}
                                compact
                                icon="calendar-today"
                            >
                                Bugüne Dön
                            </Button>
                        </AppTooltip>

                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                            <AppTooltip title="Önceki Hafta">
                                <IconButton icon="chevron-left" onPress={() => navigateWeek('prev')} size={24} />
                            </AppTooltip>

                            <AppTooltip title="Tarih Seç">
                                <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.weekSelector}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                        {format(currentWeekStart, 'd', { locale: tr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'd MMM', { locale: tr })}
                                    </Text>
                                    <IconButton icon="chevron-down" size={16} style={{ margin: 0 }} />
                                </TouchableOpacity>
                            </AppTooltip>

                            <AppTooltip title="Sonraki Hafta">
                                <IconButton icon="chevron-right" onPress={() => navigateWeek('next')} size={24} />
                            </AppTooltip>
                        </View>
                    </View>
                </View>


            </Surface>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
                    {weekDays.map((day, dayIndex) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const dayIsToday = isToday(day);
                        const isPast = day < new Date() && !dayIsToday;

                        return (
                            <Surface
                                key={dateStr}
                                style={[
                                    styles.dayCard,
                                    dayIsToday && styles.todayCard,
                                    isPast && styles.pastCard
                                ]}
                                elevation={1}
                                onLayout={(e) => {
                                    if (dayIndex === 0 && dayCardHeight === 0) {
                                        setDayCardHeight(e.nativeEvent.layout.height + 12); // +12 for marginBottom
                                    }
                                }}
                            >
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayInfo}>
                                        <Text variant="titleLarge" style={[styles.dayNumber, dayIsToday && { color: theme.colors.primary }]}>
                                            {format(day, 'd')}
                                        </Text>
                                        <View>
                                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                                                {format(day, 'EEEE', { locale: tr })}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: '#6b7280' }}>
                                                {format(day, 'MMMM yyyy', { locale: tr })}
                                            </Text>
                                        </View>
                                    </View>
                                    {dayIsToday && (
                                        <Chip compact style={styles.todayChip} textStyle={{ color: '#fff', fontSize: 11 }}>
                                            Bugün
                                        </Chip>
                                    )}
                                </View>

                                <Divider style={{ marginVertical: 8 }} />

                                {SHIFT_SLOTS.map(slot => {
                                    const slotAssignments = getSlotAssignments(dateStr, slot.id);
                                    const requirements = checkShiftRequirements(slotAssignments);

                                    return (
                                        <View key={slot.id} style={styles.slotContainer}>
                                            <View style={[styles.slotHeader, { backgroundColor: slot.color }]}>
                                                <Text style={styles.slotLabel}>{slot.labelTr}</Text>
                                                <Text style={styles.slotTime}>{slot.id}</Text>
                                                <AppTooltip title="Personel Ekle">
                                                    <IconButton
                                                        icon="plus"
                                                        size={18}
                                                        iconColor="#fff"
                                                        style={styles.slotAddButton}
                                                        onPress={() => openAddModal(dateStr, slot.id)}
                                                    />
                                                </AppTooltip>
                                            </View>

                                            <View style={styles.assignmentsContainer}>
                                                {slotAssignments.length === 0 ? (
                                                    <Text style={styles.emptyText}>Atama yok</Text>
                                                ) : (
                                                    slotAssignments.map(assignment => (
                                                        <View key={assignment.id} style={styles.assignmentChip}>
                                                            <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(assignment.staffRole) }]} />
                                                            <View style={styles.assignmentInfo}>
                                                                <Text style={styles.assignmentName}>{assignment.userName}</Text>
                                                                <Text style={[styles.assignmentRole, { color: getRoleColor(assignment.staffRole) }]}>
                                                                    {STAFF_ROLES.find(r => r.id === assignment.staffRole)?.labelTr}
                                                                </Text>
                                                            </View>
                                                            <AppTooltip title="Atamayı Sil">
                                                                <IconButton
                                                                    icon="close"
                                                                    size={16}
                                                                    iconColor="#ef4444"
                                                                    style={styles.deleteButton}
                                                                    onPress={() => handleDeleteClick(assignment)}
                                                                />
                                                            </AppTooltip>
                                                        </View>
                                                    ))
                                                )}

                                                {!requirements.isValid && (
                                                    <View style={styles.warningContainer}>
                                                        {requirements.missing.map(m => (
                                                            <Text key={m.role} style={styles.warningText}>
                                                                ⚠️ {m.count} {STAFF_ROLES.find(r => r.id === m.role)?.labelTr} eksik
                                                            </Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </Surface>
                        );
                    })}
                </ScrollView>
            )}

            {/* Calendar Popup Modal */}
            <Portal>
                <Modal visible={calendarVisible} onDismiss={() => setCalendarVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Surface style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <IconButton icon="chevron-left" onPress={() => setCalendarMonth(prev => subMonths(prev, 1))} size={20} />
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                {format(calendarMonth, 'MMMM yyyy', { locale: tr })}
                            </Text>
                            <IconButton icon="chevron-right" onPress={() => setCalendarMonth(prev => addMonths(prev, 1))} size={20} />
                        </View>

                        <View style={styles.weekDaysRow}>
                            {weekDayNames.map(day => (
                                <Text key={day} style={styles.weekDayText}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.calendarGrid}>
                            {Array.from({ length: calendarDays.paddingDays }).map((_, i) => (
                                <View key={`pad-${i}`} style={styles.dayCell} />
                            ))}

                            {calendarDays.days.map(day => {
                                const isSelected = isSameWeek(day, currentWeekStart, { weekStartsOn: 1 });
                                const isCurrentDay = isToday(day);

                                return (
                                    <TouchableOpacity
                                        key={day.toISOString()}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.selectedDayCell,
                                            isCurrentDay && !isSelected && styles.todayCellCalendar
                                        ]}
                                        onPress={() => handleSelectDate(day)}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            isSelected && styles.selectedDayText,
                                            isCurrentDay && !isSelected && styles.todayTextCalendar
                                        ]}>
                                            {format(day, 'd')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Button mode="text" onPress={() => { handleSelectDate(new Date()); }} style={{ marginTop: 8 }}>
                            Bu Haftaya Git
                        </Button>
                    </Surface>
                </Modal>
            </Portal>

            {/* Add Assignment Modal */}
            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Surface style={styles.addModalSurface}>
                        <Text variant="titleLarge" style={{ marginBottom: 16 }}>Personel Ekle</Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                            {formatDateTR(selectedDate)} - {SHIFT_SLOTS.find(s => s.id === selectedSlot)?.labelTr}
                        </Text>

                        <View style={styles.roleSelector}>
                            {STAFF_ROLES.map(role => (
                                <Chip
                                    key={role.id}
                                    selected={selectedRole === role.id}
                                    onPress={() => setSelectedRole(role.id)}
                                    style={{ marginRight: 8, marginBottom: 8 }}
                                >
                                    {role.labelTr}
                                </Chip>
                            ))}
                        </View>

                        <Divider style={{ marginVertical: 12 }} />

                        <ScrollView style={{ maxHeight: 200 }}>
                            {filteredUsers.length === 0 ? (
                                <Text style={{ color: '#9ca3af', textAlign: 'center' }}>Bu rolde personel yok</Text>
                            ) : (
                                filteredUsers.map(user => (
                                    <TouchableOpacity
                                        key={user.id}
                                        style={styles.userItem}
                                        onPress={() => handleAddAssignment(user)}
                                    >
                                        <Text>{user.fullName}</Text>
                                        <IconButton icon="plus" size={20} />
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>

                        <Button onPress={() => setModalVisible(false)} style={{ marginTop: 12 }}>Kapat</Button>
                    </Surface>
                </Modal>
            </Portal>

            {/* Delete Confirmation Modal */}
            <Portal>
                <Modal visible={deleteModalVisible} onDismiss={() => setDeleteModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Surface style={styles.deleteModalSurface}>
                        <View style={styles.deleteIcon}>
                            <IconButton icon="alert-circle" iconColor="#ef4444" size={24} />
                        </View>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold', textAlign: 'center' }}>Atamayı Sil</Text>
                        <Text style={{ textAlign: 'center', marginVertical: 12, color: '#4b5563' }}>
                            <Text style={{ fontWeight: 'bold' }}>{assignmentToDelete?.userName}</Text> silinsin mi?
                        </Text>
                        <View style={styles.deleteButtons}>
                            <Button mode="outlined" onPress={() => setDeleteModalVisible(false)} style={{ flex: 1 }}>İptal</Button>
                            <Button mode="contained" onPress={confirmDelete} style={{ flex: 1, backgroundColor: '#ef4444', marginLeft: 8 }}>Sil</Button>
                        </View>
                    </Surface>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 8, backgroundColor: '#fff', zIndex: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    weekSelector: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
    content: { padding: 12, paddingBottom: 40 },
    dayCard: { padding: 12, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' },
    todayCard: { borderWidth: 2, borderColor: '#6366f1' },
    pastCard: { opacity: 0.6 },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dayNumber: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
    todayChip: { backgroundColor: '#6366f1' },
    slotContainer: { marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
    slotHeader: { flexDirection: 'row', alignItems: 'center', padding: 8, paddingRight: 4 },
    slotLabel: { color: '#fff', fontWeight: 'bold', flex: 1 },
    slotTime: { color: '#fff', fontSize: 12, marginRight: 4 },
    slotAddButton: { margin: 0, backgroundColor: 'rgba(255,255,255,0.2)' },
    assignmentsContainer: { padding: 8, backgroundColor: '#f8fafc' },
    emptyText: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
    assignmentChip: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderRadius: 6, marginBottom: 4 },
    roleIndicator: { width: 4, height: 28, borderRadius: 2, marginRight: 10 },
    assignmentInfo: { flex: 1 },
    assignmentName: { fontWeight: '500' },
    assignmentRole: { fontSize: 11 },
    deleteButton: { margin: 0 },
    warningContainer: { marginTop: 4, padding: 4, backgroundColor: '#fef2f2', borderRadius: 4 },
    warningText: { color: '#dc2626', fontSize: 11 },
    modalContent: { padding: 20, justifyContent: 'center', alignItems: 'center' },
    calendarCard: { padding: 16, borderRadius: 16, backgroundColor: '#fff', width: '100%', maxWidth: 360 },
    calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    weekDaysRow: { flexDirection: 'row', marginBottom: 8 },
    weekDayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#6b7280' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    selectedDayCell: { backgroundColor: '#6366f1', borderRadius: 6 },
    todayCellCalendar: { borderWidth: 2, borderColor: '#6366f1', borderRadius: 6 },
    dayText: { fontSize: 14, color: '#374151' },
    selectedDayText: { color: '#fff', fontWeight: 'bold' },
    todayTextCalendar: { color: '#6366f1', fontWeight: 'bold' },
    addModalSurface: { width: '100%', maxWidth: 400, padding: 20, borderRadius: 12, backgroundColor: '#fff' },
    roleSelector: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    userItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: '#f1f5f9', borderRadius: 8, marginBottom: 4 },
    deleteModalSurface: { padding: 24, borderRadius: 12, backgroundColor: '#fff', maxWidth: 300 },
    deleteIcon: { alignItems: 'center', marginBottom: 8 },
    deleteButtons: { flexDirection: 'row', marginTop: 8 },
});
