/**
 * Profile Screen
 * 
 * Displays user profile information and logout option.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar, List, useTheme, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const theme = useTheme();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView contentContainerStyle={styles.content}>
                <Surface style={styles.header} elevation={1}>
                    <Avatar.Text
                        size={80}
                        label={getInitials(user?.fullName || 'XX')}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <Text variant="headlineSmall" style={styles.name}>
                        {user?.fullName}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                        {user?.email}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSecondaryContainer }}>
                            {user?.role === 'admin' ? 'Yönetici' : 'Personel'}
                        </Text>
                    </View>
                </Surface>

                <List.Section style={styles.section}>
                    <List.Subheader>Hesap Ayarları</List.Subheader>
                    <List.Item
                        title="Profil Bilgileri"
                        left={(props) => <List.Icon {...props} icon="account" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => { }}
                    />
                    <List.Item
                        title="Bildirimler"
                        left={(props) => <List.Icon {...props} icon="bell" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => { }}
                    />
                    <Divider />
                    <List.Item
                        title="Uygulama Hakkında"
                        left={(props) => <List.Icon {...props} icon="information" />}
                        right={(props) => <List.Icon {...props} icon="chevron-right" />}
                        onPress={() => { }}
                    />
                </List.Section>

                <View style={styles.footer}>
                    <Button
                        mode="outlined"
                        onPress={logout}
                        icon="logout"
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error }}
                    >
                        Çıkış Yap
                    </Button>
                    <Text variant="labelSmall" style={styles.version}>
                        Versiyon 1.0.0
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 24,
    },
    header: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    name: {
        marginTop: 16,
        fontWeight: 'bold',
    },
    badge: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    section: {
        backgroundColor: '#fff',
    },
    footer: {
        padding: 24,
        marginTop: 24,
        gap: 16,
    },
    version: {
        textAlign: 'center',
        color: '#9ca3af',
    },
});
