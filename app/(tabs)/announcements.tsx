import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Text, FAB, Portal, Dialog, TextInput, Button, Card, Avatar, useTheme, IconButton, Chip, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Announcement, UserNotification } from '@/src/types';
import { createAnnouncement, deleteAnnouncement, subscribeToAnnouncements, markAnnouncementAsRead } from '@/src/services/announcementService';
import { subscribeToUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/src/services/notificationService';

export default function AnnouncementsScreen() {
    const theme = useTheme();
    const { user, isAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [createVisible, setCreateVisible] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

    useEffect(() => {
        const unsubscribe = subscribeToAnnouncements((data) => {
            setAnnouncements(data);
        });
        return () => unsubscribe();
    }, []);

    // Kişisel bildirimler
    useEffect(() => {
        if (!user) return;
        const unsubscribe = subscribeToUserNotifications(user.id, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [user]);

    const handleCreate = async () => {
        if (!title || !content || !user) return;

        setLoading(true);
        try {
            await createAnnouncement(title, content, user.id, user.fullName, priority);
            setCreateVisible(false);
            resetForm();
        } catch (error) {
            console.error(error);
            alert('Duyuru oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) return;

        try {
            await deleteAnnouncement(id);
            if (selectedAnnouncement?.id === id) setSelectedAnnouncement(null);
        } catch (error) {
            console.error(error);
            alert('Silinemedi');
        }
    };

    const handleMarkAsRead = async (announcement: Announcement) => {
        if (!user || !announcement || announcement.readBy?.includes(user.id)) return;

        try {
            await markAnnouncementAsRead(announcement.id, user.id);
            // Local state is updated via subscription
            setSelectedAnnouncement(null);
        } catch (error: any) {
            console.error(error);
            alert('İşlem başarısız');
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setPriority('normal');
    };

    const renderItem = ({ item }: { item: Announcement }) => {
        const isRead = item.readBy?.includes(user?.id || '');
        const isUrgent = item.priority === 'urgent';

        return (
            <Card
                style={[
                    styles.card,
                    isUrgent && { borderColor: '#ef4444', borderWidth: 1 }
                ]}
                onPress={() => setSelectedAnnouncement(item)}
            >
                <Card.Title
                    title={item.title}
                    titleStyle={!isRead ? { fontWeight: 'bold' } : undefined}
                    subtitle={`${item.creatorName} • ${format(new Date(item.createdAt), 'd MMM HH:mm', { locale: tr })}`}
                    left={(props) => <Avatar.Icon {...props} icon="bullhorn" style={{ backgroundColor: isUrgent ? '#fee2e2' : '#f1f5f9' }} color={isUrgent ? '#ef4444' : '#64748b'} />}
                    right={(props) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!isRead && (
                                <Chip compact style={{ marginRight: 8, height: 24, backgroundColor: theme.colors.primaryContainer }} textStyle={{ fontSize: 10, lineHeight: 12 }}>Okunmadı</Chip>
                            )}
                            {isAdmin && (
                                <IconButton {...props} icon="delete" onPress={() => handleDelete(item.id)} iconColor="#ef4444" />
                            )}
                        </View>
                    )}
                />
                <Card.Content>
                    <Text variant="bodyMedium" numberOfLines={2} style={!isRead ? { fontWeight: '500' } : undefined}>
                        {item.content}
                    </Text>
                    {isUrgent && (
                        <Chip
                            icon="alert-circle"
                            style={{ alignSelf: 'flex-start', marginTop: 12, backgroundColor: '#fee2e2' }}
                            textStyle={{ color: '#ef4444' }}
                            compact
                        >
                            Önemli Duyuru
                        </Chip>
                    )}
                </Card.Content>
            </Card>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                    Duyurular
                </Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={(value) => setActiveTab(value as 'announcements' | 'notifications')}
                    buttons={[
                        { value: 'announcements', label: 'Genel Duyurular' },
                        {
                            value: 'notifications',
                            label: `Bildirimlerim${notifications.filter(n => !n.isRead).length > 0 ? ` (${notifications.filter(n => !n.isRead).length})` : ''}`
                        },
                    ]}
                />
            </View>

            {/* Content based on active tab */}
            {activeTab === 'announcements' ? (
                <FlatList
                    data={announcements}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Avatar.Icon size={64} icon="bullhorn-outline" style={{ backgroundColor: '#f1f5f9' }} color="#94a3b8" />
                            <Text style={{ marginTop: 16, color: '#94a3b8' }}>Henüz duyuru yok</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.notificationCard,
                                { borderLeftColor: item.color === 'green' ? '#22c55e' : item.color === 'red' ? '#ef4444' : '#3b82f6' }
                            ]}
                            onPress={() => markNotificationAsRead(item.id)}
                        >
                            <View style={styles.notificationHeader}>
                                <Text variant="titleSmall" style={{ fontWeight: item.isRead ? 'normal' : 'bold' }}>
                                    {item.title}
                                </Text>
                                {!item.isRead && (
                                    <Chip compact style={{ height: 20, backgroundColor: theme.colors.primaryContainer }}>
                                        <Text style={{ fontSize: 9 }}>Yeni</Text>
                                    </Chip>
                                )}
                            </View>
                            <Text
                                variant="bodyMedium"
                                style={{
                                    color: item.color === 'green' ? '#16a34a' : item.color === 'red' ? '#dc2626' : '#374151',
                                    marginTop: 4
                                }}
                            >
                                {item.message}
                            </Text>
                            <Text variant="labelSmall" style={{ color: '#94a3b8', marginTop: 8 }}>
                                {format(new Date(item.createdAt), 'd MMM HH:mm', { locale: tr })}
                            </Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Avatar.Icon size={64} icon="bell-outline" style={{ backgroundColor: '#f1f5f9' }} color="#94a3b8" />
                            <Text style={{ marginTop: 16, color: '#94a3b8' }}>Henüz bildirim yok</Text>
                        </View>
                    }
                    ListHeaderComponent={
                        notifications.filter(n => !n.isRead).length > 0 ? (
                            <Button
                                mode="text"
                                onPress={() => user && markAllNotificationsAsRead(user.id)}
                                style={{ alignSelf: 'flex-end', marginBottom: 8 }}
                            >
                                Tümünü Okundu İşaretle
                            </Button>
                        ) : null
                    }
                />
            )}

            {isAdmin && (
                <FAB
                    icon="plus"
                    label="Duyuru Ekle"
                    style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                    onPress={() => setCreateVisible(true)}
                />
            )}

            {/* Create Dialog */}
            <Portal>
                <Dialog visible={createVisible} onDismiss={() => setCreateVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Yeni Duyuru</Dialog.Title>
                    <Dialog.Content>
                        <View style={{ gap: 12 }}>
                            <TextInput
                                label="Başlık"
                                value={title}
                                onChangeText={setTitle}
                                mode="outlined"
                            />
                            <TextInput
                                label="İçerik"
                                value={content}
                                onChangeText={setContent}
                                mode="outlined"
                                multiline
                                numberOfLines={4}
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <Text style={{ marginRight: 12 }}>Öncelik:</Text>
                                <Button
                                    mode={priority === 'normal' ? 'contained' : 'outlined'}
                                    onPress={() => setPriority('normal')}
                                    compact
                                    style={{ marginRight: 8 }}
                                >
                                    Normal
                                </Button>
                                <Button
                                    mode={priority === 'urgent' ? 'contained' : 'outlined'}
                                    onPress={() => setPriority('urgent')}
                                    compact
                                    buttonColor={priority === 'urgent' ? '#ef4444' : undefined}
                                    textColor={priority === 'urgent' ? 'white' : '#ef4444'}
                                    style={priority === 'urgent' ? {} : { borderColor: '#ef4444' }}
                                >
                                    Acil
                                </Button>
                            </View>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setCreateVisible(false)}>İptal</Button>
                        <Button onPress={handleCreate} loading={loading} disabled={loading}>Paylaş</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* View/Read Dialog */}
            <Portal>
                <Dialog
                    visible={!!selectedAnnouncement}
                    onDismiss={() => setSelectedAnnouncement(null)}
                    style={{ backgroundColor: 'white', maxHeight: '80%' }}
                >
                    {selectedAnnouncement && (
                        <>
                            <Dialog.Title
                                style={selectedAnnouncement.priority === 'urgent' ? { color: '#ef4444' } : undefined}
                            >
                                {selectedAnnouncement.title}
                            </Dialog.Title>
                            <Dialog.ScrollArea>
                                <ScrollView contentContainerStyle={{ paddingTop: 8 }}>
                                    <Text style={{ marginBottom: 12, color: '#64748b', fontSize: 12 }}>
                                        {selectedAnnouncement.creatorName} • {format(new Date(selectedAnnouncement.createdAt), 'd MMMM yyyy HH:mm', { locale: tr })}
                                    </Text>
                                    <Text style={{ fontSize: 16, lineHeight: 24, marginBottom: 20 }}>
                                        {selectedAnnouncement.content}
                                    </Text>
                                </ScrollView>
                            </Dialog.ScrollArea>
                            <Dialog.Actions>
                                <Button onPress={() => setSelectedAnnouncement(null)}>Kapat</Button>
                                {!selectedAnnouncement.readBy?.includes(user?.id || '') && (
                                    <Button
                                        mode="contained"
                                        onPress={() => handleMarkAsRead(selectedAnnouncement)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Okudum
                                    </Button>
                                )}
                            </Dialog.Actions>
                        </>
                    )}
                </Dialog>
            </Portal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        marginTop: 32
    },
    tabContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    notificationCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
