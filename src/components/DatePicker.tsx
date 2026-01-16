import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';

interface DatePickerProps {
    date: Date;
    onChange: (date: Date) => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ date, onChange }) => {
    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const changeDate = (days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        onChange(d);
    };

    return (
        <View style={styles.container}>
            <IconButton icon="chevron-left" onPress={() => changeDate(-1)} size={24} />
            <Text variant="titleMedium" style={styles.dateText}>{formatDate(date)}</Text>
            <IconButton icon="chevron-right" onPress={() => changeDate(1)} size={24} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingVertical: 4,
    },
    dateText: {
        minWidth: 140,
        textAlign: 'center',
    }
});
