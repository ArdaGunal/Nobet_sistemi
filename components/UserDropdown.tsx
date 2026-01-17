/**
 * UserDropdown Component
 * 
 * A dropdown selector for choosing a user when assigning shifts.
 * Used by admins to select employees for shift assignments.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Pressable, StyleSheet } from 'react-native';
import { ChevronDown, User as UserIcon, Check, X } from 'lucide-react-native';
import { User } from '@/src/types';

interface UserDropdownProps {
    users: User[];
    selectedUserId: string | null;
    onSelectUser: (user: User) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
    users,
    selectedUserId,
    onSelectUser,
    placeholder = 'Personel seçin',
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Find the selected user
    const selectedUser = users.find((u) => u.id === selectedUserId);

    const handleSelect = (user: User) => {
        onSelectUser(user);
        setIsOpen(false);
    };

    return (
        <>
            {/* Dropdown Button */}
            <TouchableOpacity
                onPress={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                style={[
                    styles.dropdownButton,
                    disabled && styles.dropdownButtonDisabled
                ]}
            >
                <View style={styles.buttonContent}>
                    <View style={styles.iconCircle}>
                        <UserIcon size={20} color={selectedUser ? '#0056b3' : '#9ca3af'} />
                    </View>
                    <View style={styles.buttonTextContainer}>
                        <Text style={[
                            styles.buttonText,
                            selectedUser ? styles.buttonTextSelected : styles.buttonTextPlaceholder
                        ]}>
                            {selectedUser ? selectedUser.fullName : placeholder}
                        </Text>
                        {selectedUser && (
                            <Text style={styles.buttonSubtext}>{selectedUser.email}</Text>
                        )}
                    </View>
                </View>
                <ChevronDown size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Modal Dropdown */}
            <Modal
                visible={isOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setIsOpen(false)}
                >
                    <Pressable
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Personel Seçin</Text>
                            <TouchableOpacity
                                onPress={() => setIsOpen(false)}
                                style={styles.closeButton}
                            >
                                <X size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* User List */}
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => {
                                const isSelected = item.id === selectedUserId;

                                return (
                                    <TouchableOpacity
                                        onPress={() => handleSelect(item)}
                                        style={[
                                            styles.userItem,
                                            isSelected && styles.userItemSelected
                                        ]}
                                    >
                                        <View style={[
                                            styles.userAvatar,
                                            isSelected && styles.userAvatarSelected
                                        ]}>
                                            <Text style={[
                                                styles.userAvatarText,
                                                isSelected && styles.userAvatarTextSelected
                                            ]}>
                                                {item.fullName.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userFullName}>{item.fullName}</Text>
                                            <Text style={styles.userEmail}>{item.email}</Text>
                                        </View>
                                        {isSelected && <Check size={20} color="#0056b3" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>Personel bulunamadı</Text>
                                </View>
                            }
                            contentContainerStyle={{ paddingBottom: 40 }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    dropdownButtonDisabled: {
        backgroundColor: '#f3f4f6',
        borderColor: '#e5e7eb',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    buttonTextContainer: {
        flex: 1,
    },
    buttonText: {
        fontSize: 15,
    },
    buttonTextSelected: {
        color: '#111827',
        fontWeight: '500',
    },
    buttonTextPlaceholder: {
        color: '#9ca3af',
    },
    buttonSubtext: {
        fontSize: 13,
        color: '#6b7280',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    userItemSelected: {
        backgroundColor: '#eff6ff',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    userAvatarSelected: {
        backgroundColor: '#0056b3',
    },
    userAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4b5563',
    },
    userAvatarTextSelected: {
        color: '#fff',
    },
    userInfo: {
        flex: 1,
    },
    userFullName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#111827',
    },
    userEmail: {
        fontSize: 13,
        color: '#6b7280',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        color: '#6b7280',
    },
});

export default UserDropdown;
