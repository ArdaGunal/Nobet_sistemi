/**
 * ShiftList Component
 * 
 * Displays a scrollable list of shifts grouped by date.
 * Supports date filtering and pull-to-refresh.
 */

import React, { useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Shift } from '@/types';
import { ShiftCard } from './ShiftCard';

interface ShiftListProps {
    shifts: Shift[];
    isLoading?: boolean;
    isRefreshing?: boolean;
    onRefresh?: () => void;
    isAdmin?: boolean;
    onEditShift?: (shift: Shift) => void;
    onDeleteShift?: (shift: Shift) => void;
    selectedDate?: string; // Optional filter by date
    showDateSeparators?: boolean;
}

interface GroupedShift {
    date: string;
    formattedDate: string;
    shifts: Shift[];
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
const groupShiftsByDate = (shifts: Shift[]): GroupedShift[] => {
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

        const items: Array<{ type: 'header' | 'shift'; data: string | Shift }> = [];
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
            <View className="flex-1 items-center justify-center py-20">
                <ActivityIndicator size="large" color="#0056b3" />
                <Text className="mt-4 text-gray-500">Nöbetler yükleniyor...</Text>
            </View>
        );
    }

    // Empty state
    if (filteredShifts.length === 0) {
        return (
            <View className="flex-1 items-center justify-center py-20 px-6">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                    <Calendar size={36} color="#9ca3af" />
                </View>
                <Text className="text-lg font-semibold text-gray-700 mb-2">
                    Nöbet Bulunamadı
                </Text>
                <Text className="text-center text-gray-500">
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
                return (item.data as Shift).id;
            }}
            renderItem={({ item }) => {
                if (item.type === 'header') {
                    return (
                        <View className="px-4 py-3 bg-gray-50">
                            <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                {item.data as string}
                            </Text>
                        </View>
                    );
                }

                return (
                    <View className="px-4">
                        <ShiftCard
                            shift={item.data as Shift}
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

export default ShiftList;
