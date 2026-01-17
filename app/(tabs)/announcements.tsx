import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, FAB, Portal, Dialog, TextInput, Button, Card, Avatar, useTheme, IconButton, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { Announcement } from '@/src/types';
import { createAnnouncement, deleteAnnouncement, subscribeToAnnouncements, markAnnouncementAsRead } from '@/src/services/announcementService';

export default function AnnouncementsScreen() {
    const theme = useTheme();
    const { user, isAdmin } = useAuth();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

    // Auto-mark swap notifications as read when user opens this page
    useEffect(() => {
        if (!user || announcements.length === 0) return;

        const swapNotifications = announcements.filter(a =>
            a.targetUserId === user.id &&
            a.notificationType &&
            (a.notificationType === 'swap_approved' || a.notificationType === 'swap_rejected') &&
            !a.readBy?.includes(user.id)
        );

        // Mark each swap notification as read
        swapNotifications.forEach(notification => {
            markAnnouncementAsRead(notification.id, user.id);
        });
    }, [announcements, user]);

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

    // Kullanıcıya gösterilecek duyuruları filtrele
    const filteredAnnouncements = announcements.filter(item => {
        // Genel duyurular (targetUserId yok)
        if (!item.targetUserId) return true;
        // Kişiye özel bildirimler (sadece o kullanıcıya)
        return item.targetUserId === user?.id;
    });

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
                                    <IconButton
                                        icon="check"
                                        size={18}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            user && markAnnouncementAsRead(item.id, user.id);
                                        }}
                                        iconColor="#22c55e"
                                        style={{ margin: 0, marginRight: 4 }}
                                    />
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
                data={filteredAnnouncements}
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
