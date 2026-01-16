import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Appbar, TextInput, IconButton, useTheme, ActivityIndicator, Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from '@/src/types';
import { subscribeToMessages, sendMessage, markChatAsRead, updateChatUserInfo, deleteChatRoom } from '@/src/services/chatService';
import { MessageBubble } from '@/src/components/chat/MessageBubble';

export default function ChatDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const { user, isAdmin } = useAuth();

    // If opened via tab index (User view), params empty, use user.id
    // If opened via list (Admin view), params has id
    const roomId = (id as string) || user?.id || '';

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!roomId || !user) return;

        // 1. Subscribe to messages
        const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
            setMessages(newMessages);
            // Mark as read when new messages arrive if we are viewing
            markChatAsRead(roomId, user.role);
        });

        // 2. Update user info if non-admin user is viewing to ensure sync
        if (!isAdmin) {
            updateChatUserInfo(user.id, user.fullName);
        }

        return () => unsubscribe();
    }, [roomId, user, isAdmin]);

    const handleSend = async () => {
        if (!inputText.trim() || !user || !roomId) return;

        const text = inputText.trim();
        setInputText(''); // Clear immediately for UX
        setSending(true);

        try {
            await sendMessage(user, roomId, text);
        } catch (error) {
            console.error('Send failed', error);
            // Ideally show toast
            setInputText(text); // Restore text on error
        } finally {
            setSending(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await deleteChatRoom(roomId);
            setDeleteDialogVisible(false);
            router.back();
        } catch (error: any) {
            console.error('Delete failed', error);
            setDeleteDialogVisible(false);
        } finally {
            setDeleting(false);
        }
    };

    if (!roomId) return <ActivityIndicator />;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={isAdmin ? undefined : ['top']}>
            {/* Show Header only if navigated from list (Admin) or explicit requirement. 
                For User tab view, we might want a header too. */}
            <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
                {isAdmin && <Appbar.BackAction onPress={() => router.back()} />}
                <Appbar.Content title={isAdmin ? "Sohbet Detayı" : "Yönetici ile Sohbet"} />
                {isAdmin && (
                    <Appbar.Action icon="delete" onPress={() => setDeleteDialogVisible(true)} color={theme.colors.error} />
                )}
            </Appbar.Header>

            <FlatList
                ref={flatListRef}
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <MessageBubble
                        message={item}
                        isOwnMessage={item.senderId === user?.id}
                    />
                )}
                contentContainerStyle={styles.listContent}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={[styles.inputContainer, { backgroundColor: theme.colors.elevation.level1 }]}>
                    <TextInput
                        mode="outlined"
                        placeholder="Mesajınızı yazın..."
                        value={inputText}
                        onChangeText={setInputText}
                        style={styles.input}
                        multiline
                        maxLength={500}
                        right={
                            <TextInput.Icon
                                icon="send"
                                disabled={!inputText.trim() || sending}
                                onPress={handleSend}
                            />
                        }
                    />
                </View>
            </KeyboardAvoidingView>

            {/* Delete Confirmation Dialog */}
            <Portal>
                <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
                    <Dialog.Title>Sohbeti Sil</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>Bu sohbeti ve tüm mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteDialogVisible(false)}>İptal</Button>
                        <Button onPress={handleDeleteConfirm} loading={deleting} textColor={theme.colors.error}>Sil</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    inputContainer: {
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12, // Safe area padding
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    input: {
        backgroundColor: '#fff',
        maxHeight: 100,
    }
});
