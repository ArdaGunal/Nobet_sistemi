import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, useTheme, Chip } from 'react-native-paper';
import { Shift, SHIFT_SLOTS } from '@/src/types';

interface ShiftCardProps {
    shift: Shift;
    isAdmin: boolean;
    onDelete?: (shift: Shift) => void;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ shift, isAdmin, onDelete }) => {
    const theme = useTheme();
    const slotInfo = SHIFT_SLOTS.find(s => s.id === shift.shiftSlot) || SHIFT_SLOTS[0];

    const getIcon = () => {
        switch (shift.shiftSlot) {
            case '00:30-08:30': return 'weather-night';
            case '08:30-16:30': return 'weather-sunny';
            case '16:30-00:30': return 'weather-sunset';
            default: return 'weather-sunny';
        }
    };

    return (
        <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.content}>
                <View style={styles.row}>
                    <View style={[styles.iconContainer, { backgroundColor: slotInfo.color + '20' }]}>
                        <IconButton
                            icon={getIcon()}
                            iconColor={slotInfo.color}
                            size={24}
                            style={{ margin: 0 }}
                        />
                    </View>
                    <View style={styles.info}>
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{slotInfo.labelTr}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                            {shift.shiftSlot}
                        </Text>
                    </View>
                    {isAdmin && onDelete && (
                        <IconButton
                            icon="delete"
                            iconColor={theme.colors.error}
                            size={20}
                            onPress={() => onDelete(shift)}
                        />
                    )}
                </View>
                <View style={styles.divider} />
                <View style={styles.userRow}>
                    <Text variant="labelSmall" style={{ color: theme.colors.secondary, textTransform: 'uppercase' }}>
                        NÖBETÇİ
                    </Text>
                    <Text variant="bodyLarge" style={{ fontWeight: '500', marginTop: 4 }}>
                        {shift.userName}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        marginBottom: 12,
        backgroundColor: '#ffffff',
    },
    content: {
        paddingVertical: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 12,
    },
    userRow: {
        paddingLeft: 4,
    },
});
