/**
 * Messages Screen
 * 
 * - Admins: List of all ongoing chats
 * - Users: Direct chat with admin (redirects to detail)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator, useTheme, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ChatRoom } from '@/src/types';
import { subscribeToChatRooms } from '@/src/services/chatService';
import { ChatRoomItem } from '@/src/components/chat/ChatRoomItem';

export default function MessagesScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user, isAdmin } = useAuth();

    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // If user is not admin, redirect to their own chat immediately
        if (!isAdmin) {
            router.replace(`/messages/${user.id}`);
            return;
        }

        // If admin, subscribe to all rooms
        const unsubscribe = subscribeToChatRooms((newRooms) => {
            setRooms(newRooms);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isAdmin]);

    if (!isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Sohbet yükleniyor...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    Mesajlar
                </Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : rooms.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.secondary }}>
                        Henüz hiç mesaj yok
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ChatRoomItem
                            room={item}
                            onPress={() => router.push(`/messages/${item.id}`)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    listContent: {
        paddingBottom: 20,
    },
});
