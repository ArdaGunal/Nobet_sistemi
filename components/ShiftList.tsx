/**
 * ShiftList Component
 * 
 * Displays a scrollable list of shifts grouped by date.
 * Supports date filtering and pull-to-refresh.
 */

import React, { useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { ShiftAssignment } from '@/src/types';
import { ShiftCard } from './ShiftCard';

interface ShiftListProps {
    shifts: ShiftAssignment[];
    isLoading?: boolean;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    isAdmin?: boolean;
    onEditShift?: (shift: ShiftAssignment) => void;
    onDeleteShift?: (shift: ShiftAssignment) => void;
    selectedDate?: string; // Optional filter by date
    showDateSeparators?: boolean;
}

interface GroupedShift {
    date: string;
    formattedDate: string;
    shifts: ShiftAssignment[];
}

/**
 * Format date for section header
 */
const formatSectionDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
        return 'Bugün';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Yarın';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekday = date.toLocaleDateString('tr-TR', { weekday: 'long' });
    return `${weekday}, ${day}/${month}/${year}`;
};

/**
 * Group shifts by date
 */
const groupShiftsByDate = (shifts: ShiftAssignment[]): GroupedShift[] => {
    const grouped = shifts.reduce((acc, shift) => {
        const dateKey = shift.date;
        if (!acc[dateKey]) {
            acc[dateKey] = {
                date: dateKey,
                formattedDate: formatSectionDate(dateKey),
                shifts: [],
            };
        }
        acc[dateKey].shifts.push(shift);
        return acc;
    }, {} as Record<string, GroupedShift>);

    // Sort by date descending and sort shifts within each group
    return Object.values(grouped)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((group) => ({
            ...group,
            shifts: group.shifts.sort((a, b) => a.shiftSlot.localeCompare(b.shiftSlot)),
        }));
};

export const ShiftList: React.FC<ShiftListProps> = ({
    shifts,
    isLoading = false,
    isRefreshing = false,
    onRefresh,
    isAdmin = false,
    onEditShift,
    onDeleteShift,
    selectedDate,
    showDateSeparators = true,
}) => {
    // Filter shifts by selected date if provided
    const filteredShifts = useMemo(() => {
        if (!selectedDate) return shifts;
        return shifts.filter((shift) => shift.date === selectedDate);
    }, [shifts, selectedDate]);

    // Group shifts by date
    const groupedShifts = useMemo(() => {
        return groupShiftsByDate(filteredShifts);
    }, [filteredShifts]);

    // Flatten for FlatList
    const flatData = useMemo(() => {
        if (!showDateSeparators) {
            return filteredShifts.map((shift) => ({ type: 'shift' as const, data: shift }));
        }

        const items: Array<{ type: 'header' | 'shift'; data: string | ShiftAssignment }> = [];
        groupedShifts.forEach((group) => {
            items.push({ type: 'header', data: group.formattedDate });
            group.shifts.forEach((shift) => {
                items.push({ type: 'shift', data: shift });
            });
        });
        return items;
    }, [groupedShifts, filteredShifts, showDateSeparators]);

    // Loading state
    if (isLoading && shifts.length === 0) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0056b3" />
                <Text style={styles.loadingText}>Nöbetler yükleniyor...</Text>
            </View>
        );
    }

    // Empty state
    if (filteredShifts.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                    <Calendar size={36} color="#9ca3af" />
                </View>
                <Text style={styles.emptyTitle}>Nöbet Bulunamadı</Text>
                <Text style={styles.emptyText}>
                    {selectedDate
                        ? 'Seçilen tarih için nöbet kaydı bulunmuyor.'
                        : 'Henüz nöbet kaydı bulunmuyor.'}
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={flatData}
            keyExtractor={(item, index) => {
                if (item.type === 'header') {
                    return `header-${item.data}`;
                }
                return (item.data as ShiftAssignment).id;
            }}
            renderItem={({ item }) => {
                if (item.type === 'header') {
                    return (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>
                                {item.data as string}
                            </Text>
                        </View>
                    );
                }

                return (
                    <View style={styles.cardContainer}>
                        <ShiftCard
                            shift={item.data as ShiftAssignment}
                            showDate={!showDateSeparators}
                            isAdmin={isAdmin}
                            onEdit={onEditShift}
                            onDelete={onDeleteShift}
                        />
                    </View>
                );
            }}
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        colors={['#0056b3']}
                        tintColor="#0056b3"
                    />
                ) : undefined
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
        />
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    loadingText: {
        marginTop: 16,
        color: '#6b7280',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f9fafb',
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    cardContainer: {
        paddingHorizontal: 16,
    },
});

export default ShiftList;
