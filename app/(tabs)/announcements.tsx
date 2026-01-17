import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, FAB, Portal, Dialog, TextInput, Button, Card, Avatar, useTheme, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Announcement } from '@/src/types';
import { createAnnouncement, deleteAnnouncement, subscribeToAnnouncements, markAnnouncementAsRead } from '@/src/services/announcementService';
import { subscribeToPersonalNotifications, markNotificationAsRead as markPersonalAsRead, PersonalNotification } from '@/src/services/personalNotificationService';

export default function AnnouncementsScreen() {
    const theme = useTheme();
    const { user, isAdmin } = useAuth();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [personalNotifications, setPersonalNotifications] = useState<PersonalNotification[]>([]);
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

    // Subscribe to Personal Notifications
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeToPersonalNotifications(user.id, (data) => {
            setPersonalNotifications(data);
        });
        return () => unsub();
    }, [user]);

    // Auto-mark swap notifications as read (Both types)
    useEffect(() => {
        if (!user) return;

        // 1. Personal Notifications
        const unreadPersonalSwap = personalNotifications.filter(n =>
            !n.isRead && (n.type === 'swap_approved' || n.type === 'swap_rejected')
        );
        unreadPersonalSwap.forEach(n => markPersonalAsRead(user.id, n.id));

        // 2. Legacy/General Announcements (if any matched)
        // ... (Code below handles this part, but we can verify)
    }, [personalNotifications, user]);

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
        if (!user || !announcement) return;

        // Check if it's a personal notification
        const isPersonal = personalNotifications.some(n => n.id === announcement.id);

        if (isPersonal) {
            if (announcement.readBy?.includes(user.id)) return;
            try {
                await markPersonalAsRead(user.id, announcement.id);
                // Local state is updated via subscription
                setSelectedAnnouncement(null);
            } catch (error) {
                console.error(error);
            }
            return;
        }

        // General Announcement
        if (announcement.readBy?.includes(user.id)) return;

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

    // Kullanıcıya gösterilecek duyuruları filtrele
    // Kullanıcıya gösterilecek duyuruları filtrele
    const filteredAnnouncements = announcements.filter(item => {
        // 1. targetUserId varsa, sadece ilgili kullanıcıya göster
        if (item.targetUserId) {
            return item.targetUserId === user?.id;
        }

        // 2. targetUserId YOKSA:
        // Eğer notificationType varsa (swap vb.), bu bir hatadır/eski kayıttır -> GÖSTERME
        if (item.notificationType) {
            return false;
        }

        // 3. targetUserId yok ve notificationType yok -> GENEL DUYURU
        return true;
    });

    // Merge and Sort
    const combinedList = [
        ...filteredAnnouncements,
        ...personalNotifications.map(n => ({
            id: n.id,
            title: n.title,
            content: n.content,
            priority: 'normal' as const,
            createdAt: n.createdAt,
            createdBy: 'system',
            creatorName: 'Sistem',
            readBy: n.isRead ? [user?.id || ''] : [],
            targetUserId: user?.id,
            notificationType: n.type,
            notificationColor: n.color,
            isActive: true
        } as Announcement))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const renderItem = ({ item }: { item: Announcement }) => {
        const isRead = item.readBy?.includes(user?.id || '');
        const isUrgent = item.priority === 'urgent';
        const isPersonalNotification = !!item.notificationType;

        // Renk belirleme
        const getBorderColor = () => {
            if (item.notificationColor === 'green') return '#22c55e';
            if (item.notificationColor === 'red') return '#ef4444';
            if (isUrgent) return '#ef4444';
            return undefined;
        };

        const getIconColor = () => {
            if (item.notificationColor === 'green') return '#22c55e';
            if (item.notificationColor === 'red') return '#ef4444';
            if (isUrgent) return '#ef4444';
            return '#64748b';
        };

        const getIconBgColor = () => {
            if (item.notificationColor === 'green') return '#dcfce7';
            if (item.notificationColor === 'red') return '#fee2e2';
            if (isUrgent) return '#fee2e2';
            return '#f1f5f9';
        };

        return (
            <Card
                style={[
                    styles.card,
                    getBorderColor() && { borderColor: getBorderColor(), borderWidth: 2 }
                ]}
                onPress={() => setSelectedAnnouncement(item)}
            >
                <Card.Title
                    title={item.title}
                    titleStyle={[
                        !isRead && { fontWeight: 'bold' },
                        item.notificationColor === 'green' && { color: '#16a34a' },
                        item.notificationColor === 'red' && { color: '#dc2626' }
                    ]}
                    subtitle={`${item.creatorName} • ${format(new Date(item.createdAt), 'd MMM HH:mm', { locale: tr })}`}
                    left={(props) => (
                        <Avatar.Icon
                            {...props}
                            icon={isPersonalNotification ? (item.notificationColor === 'green' ? 'check-circle' : 'close-circle') : 'bullhorn'}
                            style={{ backgroundColor: getIconBgColor() }}
                            color={getIconColor()}
                        />
                    )}
                    right={(props) => (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {!isRead && (
                                <>
                                    <Chip compact style={{ marginRight: 4, height: 24, backgroundColor: theme.colors.primaryContainer }} textStyle={{ fontSize: 10, lineHeight: 12 }}>Yeni</Chip>
                                    <Chip
                                        compact
                                        icon="check"
                                        style={{ height: 24, backgroundColor: '#dcfce7', marginRight: 4 }}
                                        textStyle={{ fontSize: 10, lineHeight: 12, color: '#16a34a' }}
                                        onPress={(e: any) => {
                                            e?.stopPropagation?.();
                                            user && markAnnouncementAsRead(item.id, user.id);
                                        }}
                                    >
                                        Okundu
                                    </Chip>
                                </>
                            )}
                            {isAdmin && !isPersonalNotification && (
                                <IconButton {...props} icon="delete" onPress={() => handleDelete(item.id)} iconColor="#ef4444" />
                            )}
                        </View>
                    )}
                />
                <Card.Content>
                    <Text
                        variant="bodyMedium"
                        numberOfLines={2}
                        style={[
                            !isRead && { fontWeight: '500' },
                            item.notificationColor === 'green' && { color: '#16a34a' },
                            item.notificationColor === 'red' && { color: '#dc2626' }
                        ]}
                    >
                        {item.content}
                    </Text>
                    {isUrgent && !isPersonalNotification && (
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

            <FlatList
                data={combinedList}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>
                        Henüz duyuru veya bildirim yok
                    </Text>
                )}
            />

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
