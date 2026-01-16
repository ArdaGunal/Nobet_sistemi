import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, Button, Text } from 'react-native-paper';
import { User } from '@/src/types';

interface UserDropdownProps {
    users: User[];
    selectedUser: User | null;
    onSelect: (user: User) => void;
    isLoading?: boolean;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({ users, selectedUser, onSelect, isLoading }) => {
    const [visible, setVisible] = useState(false);

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    return (
        <View style={styles.container}>
            <Menu
                visible={visible}
                onDismiss={closeMenu}
                anchor={
                    <Button
                        mode="outlined"
                        onPress={openMenu}
                        loading={isLoading}
                        icon="chevron-down"
                        contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                        style={styles.button}
                    >
                        {selectedUser ? selectedUser.fullName : 'Personel Seçin'}
                    </Button>
                }
            >
                {users.map((user) => (
                    <Menu.Item
                        key={user.id}
                        onPress={() => {
                            onSelect(user);
                            closeMenu();
                        }}
                        title={user.fullName}
                        leadingIcon={selectedUser?.id === user.id ? 'check' : undefined}
                    />
                ))}
            </Menu>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    button: {
        borderRadius: 8,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
    },
});
