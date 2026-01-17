/**
 * ShiftCard Component
 * 
 * Displays a single shift in a modern card design.
 * Shows shift slot (time range), assigned user, and date.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Moon, Sun, Sunset, Trash2, Edit3 } from 'lucide-react-native';
import { ShiftAssignment, SHIFT_SLOTS } from '@/src/types';

interface ShiftCardProps {
    shift: ShiftAssignment;
    showDate?: boolean;
    isAdmin?: boolean;
    onEdit?: (shift: ShiftAssignment) => void;
    onDelete?: (shift: ShiftAssignment) => void;
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
        <View style={styles.card}>
            {/* Header with Shift Slot */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    {/* Shift Icon with colored background */}
                    <View style={[styles.iconContainer, { backgroundColor: `${slotInfo.color}15` }]}>
                        {getShiftIcon(shift.shiftSlot, slotInfo.color)}
                    </View>

                    {/* Shift Time and Label */}
                    <View style={styles.shiftInfo}>
                        <Text style={styles.shiftLabel}>{slotInfo.labelTr}</Text>
                        <Text style={styles.shiftTime}>{shift.shiftSlot}</Text>
                    </View>
                </View>

                {/* Admin Actions */}
                {isAdmin && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() => onEdit?.(shift)}
                            style={[styles.actionBtn, styles.editBtn]}
                        >
                            <Edit3 size={18} color="#0056b3" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => onDelete?.(shift)}
                            style={[styles.actionBtn, styles.deleteBtn]}
                        >
                            <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Assigned User */}
            <View style={styles.userContainer}>
                <Text style={styles.userLabel}>Nöbetçi</Text>
                <Text style={styles.userName}>{shift.userName}</Text>
            </View>

            {/* Date */}
            {showDate && (
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>📅 {formatDate(shift.date)}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    shiftInfo: {
        flex: 1,
    },
    shiftLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    shiftTime: {
        fontSize: 14,
        color: '#6b7280',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editBtn: {
        backgroundColor: '#dbeafe',
        marginRight: 8,
    },
    deleteBtn: {
        backgroundColor: '#fee2e2',
    },
    userContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    userLabel: {
        fontSize: 11,
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    userName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    dateContainer: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
    dateText: {
        fontSize: 13,
        color: '#6b7280',
    },
});

export default ShiftCard;
