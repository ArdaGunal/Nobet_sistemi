/**
 * UserDropdown Component
 * 
 * A dropdown selector for choosing a user when assigning shifts.
 * Used by admins to select employees for shift assignments.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { ChevronDown, User as UserIcon, Check, X } from 'lucide-react-native';
import { User } from '@/types';

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
                className={`flex-row items-center justify-between p-4 rounded-xl border ${disabled ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'
                    }`}
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                }}
            >
                <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
                        <UserIcon size={20} color={selectedUser ? '#0056b3' : '#9ca3af'} />
                    </View>
                    <View className="flex-1">
                        <Text
                            className={`text-base ${selectedUser ? 'text-gray-900 font-medium' : 'text-gray-400'
                                }`}
                        >
                            {selectedUser ? selectedUser.fullName : placeholder}
                        </Text>
                        {selectedUser && (
                            <Text className="text-sm text-gray-500">{selectedUser.email}</Text>
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
                    className="flex-1 bg-black/50 justify-end"
                    onPress={() => setIsOpen(false)}
                >
                    <Pressable
                        className="bg-white rounded-t-3xl max-h-[70%]"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
                            <Text className="text-lg font-semibold text-gray-900">
                                Personel Seçin
                            </Text>
                            <TouchableOpacity
                                onPress={() => setIsOpen(false)}
                                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
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
                                        className={`flex-row items-center px-6 py-4 border-b border-gray-50 ${isSelected ? 'bg-blue-50' : ''
                                            }`}
                                    >
                                        <View
                                            className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${isSelected ? 'bg-primary' : 'bg-gray-100'
                                                }`}
                                            style={isSelected ? { backgroundColor: '#0056b3' } : undefined}
                                        >
                                            <Text
                                                className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-600'
                                                    }`}
                                            >
                                                {item.fullName.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-base font-medium text-gray-900">
                                                {item.fullName}
                                            </Text>
                                            <Text className="text-sm text-gray-500">{item.email}</Text>
                                        </View>
                                        {isSelected && <Check size={20} color="#0056b3" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View className="items-center justify-center py-12">
                                    <Text className="text-gray-500">Personel bulunamadı</Text>
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

export default UserDropdown;
