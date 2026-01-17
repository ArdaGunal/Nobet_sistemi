/**
 * DateSelector Component
 * 
 * A horizontal date picker showing 7 days.
 * Users can select a date to filter shifts.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface DateSelectorProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    startDate?: Date;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
const toISODate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

/**
 * Get day name in Turkish
 */
const getDayName = (date: Date): string => {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return days[date.getDay()];
};

/**
 * Get month name in Turkish
 */
const getMonthName = (date: Date): string => {
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[date.getMonth()];
};

export const DateSelector: React.FC<DateSelectorProps> = ({
    selectedDate,
    onDateChange,
    startDate = new Date(),
}) => {
    // Generate array of 7 dates starting from startDate
    const dates = useMemo(() => {
        const result = [];
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            result.push({
                date,
                isoDate: toISODate(date),
                dayName: getDayName(date),
                dayNumber: date.getDate(),
                isToday: toISODate(date) === toISODate(new Date()),
            });
        }
        return result;
    }, [startDate]);

    // Current month/year display
    const headerDate = useMemo(() => {
        const selected = new Date(selectedDate);
        return `${getMonthName(selected)} ${selected.getFullYear()}`;
    }, [selectedDate]);

    return (
        <View style={styles.container}>
            {/* Month Header */}
            <View style={styles.header}>
                <Text style={styles.headerText}>{headerDate}</Text>
                <View style={styles.navButtons}>
                    <TouchableOpacity
                        onPress={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 1);
                            onDateChange(toISODate(newDate));
                        }}
                        style={[styles.navButton, { marginRight: 8 }]}
                    >
                        <ChevronLeft size={20} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 1);
                            onDateChange(toISODate(newDate));
                        }}
                        style={styles.navButton}
                    >
                        <ChevronRight size={20} color="#374151" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date Pills */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12 }}
            >
                {dates.map((item) => {
                    const isSelected = item.isoDate === selectedDate;

                    return (
                        <TouchableOpacity
                            key={item.isoDate}
                            onPress={() => onDateChange(item.isoDate)}
                            style={[
                                styles.datePill,
                                isSelected && styles.datePillSelected,
                                item.isToday && !isSelected && styles.datePillToday,
                            ]}
                        >
                            <Text style={[
                                styles.dayName,
                                isSelected && styles.dayNameSelected
                            ]}>
                                {item.dayName}
                            </Text>
                            <Text style={[
                                styles.dayNumber,
                                isSelected && styles.dayNumberSelected
                            ]}>
                                {item.dayNumber}
                            </Text>
                            {item.isToday && !isSelected && (
                                <View style={styles.todayDot} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    navButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
    },
    datePill: {
        width: 56,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
        backgroundColor: '#f9fafb',
    },
    datePillSelected: {
        backgroundColor: '#0056b3',
    },
    datePillToday: {
        backgroundColor: '#eff6ff',
        borderWidth: 1,
        borderColor: '#0056b3',
    },
    dayName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6b7280',
        marginBottom: 4,
    },
    dayNameSelected: {
        color: '#fff',
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    dayNumberSelected: {
        color: '#fff',
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0056b3',
        marginTop: 4,
    },
});

export default DateSelector;
