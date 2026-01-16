import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, useTheme, Avatar, Badge, Surface } from 'react-native-paper';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChatRoom } from '../../types';

interface ChatRoomItemProps {
    room: ChatRoom;
    onPress: () => void;
}

export const ChatRoomItem: React.FC<ChatRoomItemProps> = ({ room, onPress }) => {
    const theme = useTheme();

    return (
        <Surface style={styles.surface} elevation={0}>
            <TouchableOpacity onPress={onPress} style={styles.container}>
                <View style={styles.avatarContainer}>
                    <Avatar.Text
                        size={48}
                        label={room.userName.substring(0, 2).toUpperCase()}
                        style={{ backgroundColor: theme.colors.secondaryContainer }}
                        color={theme.colors.onSecondaryContainer}
                    />
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
                            {room.userName}
                        </Text>
                        {room.lastMessageTime && (
                            <Text variant="bodySmall" style={styles.time}>
                                {formatDistanceToNow(new Date(room.lastMessageTime), { addSuffix: true, locale: tr })}
                            </Text>
                        )}
                    </View>
                    {room.userEmail && (
                        <Text variant="labelSmall" style={{ color: theme.colors.outline, fontSize: 11, marginBottom: 2 }}>
                            {room.userEmail}
                        </Text>
                    )}

                    <View style={styles.footer}>
                        <Text
                            variant="bodyMedium"
                            style={[
                                styles.message,
                                {
                                    color: room.unreadCountAdmin > 0 ? theme.colors.onSurface : theme.colors.outline,
                                    fontWeight: room.unreadCountAdmin > 0 ? 'bold' : 'normal'
                                }
                            ]}
                            numberOfLines={1}
                        >
                            {room.lastMessage || 'Henüz mesaj yok'}
                        </Text>

                        {room.unreadCountAdmin > 0 && (
                            <Badge size={22} style={styles.badge}>{room.unreadCountAdmin}</Badge>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Surface>
    );
};

const styles = StyleSheet.create({
    surface: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    container: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    avatarContainer: {
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    time: {
        color: '#64748b',
        fontSize: 11,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        marginRight: 8,
    },
    badge: {
        backgroundColor: '#ef4444',
    }
});
