/**
 * ShiftSlotSelector Component
 * 
 * A selector for the three fixed shift slots.
 * Used when creating or editing shifts.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Moon, Sun, Sunset } from 'lucide-react-native';
import { ShiftSlot, SHIFT_SLOTS, ShiftSlotInfo } from '@/types';

interface ShiftSlotSelectorProps {
    selectedSlot: ShiftSlot | null;
    onSelectSlot: (slot: ShiftSlot) => void;
    disabled?: boolean;
}

/**
 * Get the icon component for a shift slot
 */
const getShiftIcon = (slotId: string, isSelected: boolean) => {
    const color = isSelected ? '#ffffff' : '#374151';
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

export const ShiftSlotSelector: React.FC<ShiftSlotSelectorProps> = ({
    selectedSlot,
    onSelectSlot,
    disabled = false,
}) => {
    return (
        <View className="flex-row justify-between">
            {SHIFT_SLOTS.map((slot) => {
                const isSelected = slot.id === selectedSlot;

                return (
                    <TouchableOpacity
                        key={slot.id}
                        onPress={() => !disabled && onSelectSlot(slot.id)}
                        disabled={disabled}
                        className={`flex-1 mx-1 rounded-xl p-4 items-center ${disabled ? 'opacity-50' : ''
                            }`}
                        style={{
                            backgroundColor: isSelected ? slot.color : '#f3f4f6',
                            shadowColor: isSelected ? slot.color : '#000',
                            shadowOffset: { width: 0, height: isSelected ? 4 : 1 },
                            shadowOpacity: isSelected ? 0.3 : 0.05,
                            shadowRadius: isSelected ? 8 : 2,
                            elevation: isSelected ? 4 : 1,
                        }}
                    >
                        {/* Icon */}
                        <View className="mb-2">
                            {getShiftIcon(slot.id, isSelected)}
                        </View>

                        {/* Label */}
                        <Text
                            className={`text-sm font-semibold mb-1 ${isSelected ? 'text-white' : 'text-gray-700'
                                }`}
                        >
                            {slot.labelTr}
                        </Text>

                        {/* Time Range */}
                        <Text
                            className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'
                                }`}
                        >
                            {slot.startTime} - {slot.endTime}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default ShiftSlotSelector;
