import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
    message: ChatMessage;
    isOwnMessage: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
    const theme = useTheme();

    return (
        <View style={[
            styles.container,
            isOwnMessage ? styles.ownContainer : styles.otherContainer
        ]}>
            <Surface
                style={[
                    styles.bubble,
                    isOwnMessage
                        ? { backgroundColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.elevation.level2 }
                ]}
                elevation={1}
            >
                {!isOwnMessage && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text variant="labelSmall" style={[styles.senderName, { color: theme.colors.outline }]}>
                            {message.senderName}
                        </Text>
                        {(message.senderRole === 'admin' || message.senderRole === 'super_admin') && (
                            <View style={{ backgroundColor: theme.colors.errorContainer, borderRadius: 4, paddingHorizontal: 4, marginLeft: 4 }}>
                                <Text style={{ fontSize: 8, color: theme.colors.onErrorContainer }}>YÖNETİCİ</Text>
                            </View>
                        )}
                    </View>
                )}

                <Text
                    variant="bodyMedium"
                    style={{
                        color: isOwnMessage ? theme.colors.onPrimary : theme.colors.onSurface
                    }}
                >
                    {message.text}
                </Text>

                <Text
                    variant="labelSmall"
                    style={[
                        styles.time,
                        { color: isOwnMessage ? 'rgba(255,255,255,0.7)' : theme.colors.outline }
                    ]}
                >
                    {format(new Date(message.createdAt), 'HH:mm', { locale: tr })}
                </Text>
            </Surface>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 8,
        flexDirection: 'row',
    },
    ownContainer: {
        justifyContent: 'flex-end',
    },
    otherContainer: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        borderBottomRightRadius: 2, // Own message style
    },
    senderName: {
        marginBottom: 2,
        fontSize: 10,
    },
    time: {
        alignSelf: 'flex-end',
        marginTop: 4,
        fontSize: 10,
    },
});
