/**
 * ShiftSlotSelector Component
 * 
 * A selector for the three fixed shift slots.
 * Used when creating or editing shifts.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Moon, Sun, Sunset } from 'lucide-react-native';
import { ShiftSlot, SHIFT_SLOTS } from '@/src/types';

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
        <View style={styles.container}>
            {SHIFT_SLOTS.map((slot) => {
                const isSelected = slot.id === selectedSlot;

                return (
                    <TouchableOpacity
                        key={slot.id}
                        onPress={() => !disabled && onSelectSlot(slot.id)}
                        disabled={disabled}
                        style={[
                            styles.slotButton,
                            { backgroundColor: isSelected ? slot.color : '#f3f4f6' },
                            isSelected && {
                                shadowColor: slot.color,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            },
                            disabled && styles.disabled,
                        ]}
                    >
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            {getShiftIcon(slot.id, isSelected)}
                        </View>

                        {/* Label */}
                        <Text style={[
                            styles.label,
                            isSelected && styles.labelSelected
                        ]}>
                            {slot.labelTr}
                        </Text>

                        {/* Time Range */}
                        <Text style={[
                            styles.timeRange,
                            isSelected && styles.timeRangeSelected
                        ]}>
                            {slot.id}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    slotButton: {
        flex: 1,
        marginHorizontal: 4,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    disabled: {
        opacity: 0.5,
    },
    iconContainer: {
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    labelSelected: {
        color: '#fff',
    },
    timeRange: {
        fontSize: 11,
        color: '#6b7280',
    },
    timeRangeSelected: {
        color: 'rgba(255,255,255,0.8)',
    },
});

export default ShiftSlotSelector;
