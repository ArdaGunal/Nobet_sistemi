/**
 * DateSelector Component
 * 
 * A horizontal date picker showing 7 days.
 * Users can select a date to filter shifts.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
        <View className="bg-white border-b border-gray-100">
            {/* Month Header */}
            <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-lg font-semibold text-gray-900">
                    {headerDate}
                </Text>
                <View className="flex-row items-center">
                    <TouchableOpacity
                        onPress={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() - 1);
                            onDateChange(toISODate(newDate));
                        }}
                        className="w-8 h-8 rounded-full items-center justify-center bg-gray-100 mr-2"
                    >
                        <ChevronLeft size={20} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            const newDate = new Date(selectedDate);
                            newDate.setDate(newDate.getDate() + 1);
                            onDateChange(toISODate(newDate));
                        }}
                        className="w-8 h-8 rounded-full items-center justify-center bg-gray-100"
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
                            className={`w-14 h-18 rounded-xl items-center justify-center mx-1 py-2 ${isSelected
                                    ? 'bg-primary'
                                    : item.isToday
                                        ? 'bg-blue-50 border border-primary'
                                        : 'bg-gray-50'
                                }`}
                            style={isSelected ? { backgroundColor: '#0056b3' } : undefined}
                        >
                            <Text
                                className={`text-xs font-medium mb-1 ${isSelected ? 'text-white' : 'text-gray-500'
                                    }`}
                            >
                                {item.dayName}
                            </Text>
                            <Text
                                className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'
                                    }`}
                            >
                                {item.dayNumber}
                            </Text>
                            {item.isToday && !isSelected && (
                                <View className="w-1.5 h-1.5 rounded-full bg-primary mt-1" style={{ backgroundColor: '#0056b3' }} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

export default DateSelector;
