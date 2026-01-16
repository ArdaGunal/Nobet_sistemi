/**
 * ShiftCard Component
 * 
 * Displays a single shift in a modern card design.
 * Shows shift slot (time range), assigned user, and date.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Moon, Sun, Sunset, Trash2, Edit3 } from 'lucide-react-native';
import { Shift, SHIFT_SLOTS, ShiftSlotInfo } from '@/types';

interface ShiftCardProps {
    shift: Shift;
    showDate?: boolean;
    isAdmin?: boolean;
    onEdit?: (shift: Shift) => void;
    onDelete?: (shift: Shift) => void;
}

/**
 * Get the icon component for a shift slot
 */
const getShiftIcon = (slotId: string, color: string) => {
    const iconProps = { size: 24, color, strokeWidth: 2 };

    switch (slotId) {
        case '00:30-08:30':
            return <Moon {...iconProps} />;
        case '08:30-16:30':
            return <Sun {...iconProps} />;
        case '16:30-00:30':
            return <Sunset {...iconProps} />;
        default:
            return <Sun {...iconProps} />;
    }
};

/**
 * Format date to DD/MM/YYYY format
 */
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const weekday = date.toLocaleDateString('tr-TR', { weekday: 'long' });
    return `${weekday}, ${day}/${month}/${year}`;
};

export const ShiftCard: React.FC<ShiftCardProps> = ({
    shift,
    showDate = true,
    isAdmin = false,
    onEdit,
    onDelete,
}) => {
    // Find the shift slot info
    const slotInfo = SHIFT_SLOTS.find((s) => s.id === shift.shiftSlot) || SHIFT_SLOTS[0];

    return (
        <View
            className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
            }}
        >
            {/* Header with Shift Slot */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                    {/* Shift Icon with colored background */}
                    <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: `${slotInfo.color}15` }}
                    >
                        {getShiftIcon(shift.shiftSlot, slotInfo.color)}
                    </View>

                    {/* Shift Time and Label */}
                    <View className="flex-1">
                        <Text className="text-lg font-semibold text-gray-900">
                            {slotInfo.labelTr}
                        </Text>
                        <Text className="text-sm text-gray-500">
                            {shift.shiftSlot}
                        </Text>
                    </View>
                </View>

                {/* Admin Actions */}
                {isAdmin && (
                    <View className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => onEdit?.(shift)}
                            className="w-10 h-10 rounded-lg items-center justify-center mr-2 bg-blue-50"
                        >
                            <Edit3 size={18} color="#0056b3" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onDelete?.(shift)}
                            className="w-10 h-10 rounded-lg items-center justify-center bg-red-50"
                        >
                            <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Assigned User */}
            <View className="bg-gray-50 rounded-lg p-3 mb-2">
                <Text className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    Nöbetçi
                </Text>
                <Text className="text-base font-medium text-gray-800">
                    {shift.userName}
                </Text>
            </View>

            {/* Date */}
            {showDate && (
                <View className="pt-2 border-t border-gray-100">
                    <Text className="text-sm text-gray-500">
                        📅 {formatDate(shift.date)}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default ShiftCard;
