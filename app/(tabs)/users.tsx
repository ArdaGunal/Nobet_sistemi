/**
 * User Management Screen (Admin Only)
 * 
 * Allows admins to view and manage approved users.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import {
    Text,
    Portal,
    Modal,
    TextInput,
    Button,
    IconButton,
    useTheme,
    Surface,
    ActivityIndicator,
    Chip,
    SegmentedButtons,
    Divider,
    RadioButton,
    Dialog,
    Paragraph
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { subscribeToUsers, updateUser, deleteUser, revokeUserApproval, syncUserShiftRoles, repairDatabase } from '@/src/services/userService';
import { User, StaffRole, STAFF_ROLES, RotationGroup, UserRole } from '@/src/types';
import { AppTooltip } from '@/src/components';

export default function UsersScreen() {
    const theme = useTheme();
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter only approved users or admins
    const displayedUsers = users.filter(u => u.isApproved || u.role === 'admin' || u.role === 'super_admin');

    // Edit Modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editFullName, setEditFullName] = useState('');
    const [editStaffRole, setEditStaffRole] = useState<StaffRole>('saglikci');
    const [editRotationGroup, setEditRotationGroup] = useState<RotationGroup>('A');
    const [editRole, setEditRole] = useState<UserRole>('user');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToUsers(
            (updatedUsers) => {
                setUsers(updatedUsers);
                setLoading(false);
            },
            (error) => {
                console.error(error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setEditFullName(user.fullName);
        setEditStaffRole(user.staffRole || 'saglikci');
        setEditRotationGroup(user.rotationGroup || 'A');
        setEditRole(user.role);
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setSaving(true);
        try {
            await updateUser(editingUser.id, {
                staffRole: editStaffRole,
                rotationGroup: editRotationGroup,
                role: editRole,
            });
            setEditModalVisible(false);
            Alert.alert('Başarılı', 'Kullanıcı bilgileri güncellendi');
        } catch (error: any) {
            Alert.alert('Hata', error.message || 'Güncelleme başarısız');
        } finally {
            setSaving(false);
        }
    };

    // Dialog States
    const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmButtonText, setConfirmButtonText] = useState('');
    const [isDestructive, setIsDestructive] = useState(false);

    const handleRevokeApproval = (user: User) => {
        setConfirmTitle('Onayı Geri Al');
        setConfirmMessage(`${user.fullName} kullanıcısının onayını geri almak istediğinize emin misiniz?`);
        setConfirmButtonText('Geri Al');
        setIsDestructive(true);
        setConfirmAction(() => async () => {
            try {
                await revokeUserApproval(user.id);
            } catch (error: any) {
                console.error(error);
            }
        });
        setConfirmDialogVisible(true);
    };

    const handleDeleteUser = (user: User) => {
        setConfirmTitle('Kullanıcıyı Sil');
        setConfirmMessage(`${user.fullName} kullanıcısını silmek istediğinize emin misiniz?`);
        setConfirmButtonText('Sil');
        setIsDestructive(true);
        setConfirmAction(() => async () => {
            try {
                await deleteUser(user.id);
            } catch (error: any) {
                console.error(error);
            }
        });
        setConfirmDialogVisible(true);
    };

    const executeConfirmAction = async () => {
        if (confirmAction) {
            await confirmAction();
        }
        setConfirmDialogVisible(false);
    };

    const getStaffRoleInfo = (staffRole?: StaffRole) => {
        return STAFF_ROLES.find(r => r.id === staffRole) || { labelTr: 'Atanmamış', color: '#9ca3af' };
    };

    const renderUser = ({ item }: { item: User }) => {
        const staffRoleInfo = getStaffRoleInfo(item.staffRole);
        const isCurrentUser = item.id === currentUser?.id;
        const isAdminOrSuperAdmin = item.role === 'admin' || item.role === 'super_admin';

        // Admin cannot edit Super Admins (only Super Admins can edit Super Admins)
        const canEdit = !(item.role === 'super_admin' && currentUser?.role === 'admin');

        return (
            <Surface style={styles.userCard} elevation={1}>
                <View style={styles.userInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                            {item.fullName}
                        </Text>
                        {isCurrentUser && (
                            <Chip compact style={{ backgroundColor: '#dbeafe' }} textStyle={{ fontSize: 10 }}>
                                Sen
                            </Chip>
                        )}
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                        {item.email}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Chip
                            style={[styles.roleChip, { backgroundColor: staffRoleInfo.color + '20' }]}
                            textStyle={{ color: staffRoleInfo.color, fontSize: 12 }}
                            compact
                        >
                            {staffRoleInfo.labelTr}
                        </Chip>
                        {isAdminOrSuperAdmin && (
                            <Chip
                                style={[styles.roleChip, { backgroundColor: '#7c3aed20' }]}
                                textStyle={{ color: '#7c3aed', fontSize: 12 }}
                                compact
                            >
                                {item.role === 'super_admin' ? 'Süper Admin' : 'Admin'}
                            </Chip>
                        )}
                        {!isAdminOrSuperAdmin && item.rotationGroup && (
                            <Chip
                                style={[styles.roleChip, { backgroundColor: '#e5e7eb' }]}
                                textStyle={{ color: '#374151', fontSize: 12 }}
                                compact
                            >
                                Grup {item.rotationGroup}
                            </Chip>
                        )}
                    </View>
                </View>
                <View style={styles.actions}>
                    {canEdit && (
                        <AppTooltip title="Düzenle">
                            <IconButton
                                icon="pencil"
                                iconColor="#3b82f6"
                                size={20}
                                onPress={() => handleOpenEditModal(item)}
                            />
                        </AppTooltip>
                    )}
                    {!isAdminOrSuperAdmin && !isCurrentUser && (
                        <>
                            <AppTooltip title="Onayı Kaldır">
                                <IconButton
                                    icon="account-cancel"
                                    iconColor="#f59e0b"
                                    size={20}
                                    onPress={() => handleRevokeApproval(item)}
                                />
                            </AppTooltip>
                            <AppTooltip title="Sil">
                                <IconButton
                                    icon="delete"
                                    iconColor={theme.colors.error}
                                    size={20}
                                    onPress={() => handleDeleteUser(item)}
                                />
                            </AppTooltip>
                        </>
                    )}
                </View>
            </Surface>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                        Personel Listesi
                    </Text>
                    <Chip icon="account-group" style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                        {displayedUsers.length} Kişi
                    </Chip>
                </View>
                {currentUser?.role === 'super_admin' && (
                    <Button
                        mode="contained-tonal"
                        icon="database-refresh"
                        compact
                        onPress={() => {
                            Alert.alert(
                                'Veri Tabanını Onar',
                                'Eski kullanıcı verilerini güncel formata çevirmek ve tüm nöbet renklerini eşitlemek üzeresiniz. Bu işlem biraz zaman alabilir.',
                                [
                                    { text: 'İptal', style: 'cancel' },
                                    {
                                        text: 'Onar',
                                        onPress: async () => {
                                            setLoading(true);
                                            try {
                                                const result = await repairDatabase();
                                                Alert.alert('Başarılı', result);
                                            } catch (e: any) {
                                                Alert.alert('Hata', e.message);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        Verileri Onar
                    </Button>
                )}
            </View>

            {/* User List */}
            {displayedUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={{ color: theme.colors.secondary }}>
                        Onaylı kullanıcı bulunamadı
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayedUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Edit Modal */}
            <Portal>
                <Modal
                    visible={editModalVisible}
                    onDismiss={() => setEditModalVisible(false)}
                    contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
                >
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
                        Kullanıcıyı Düzenle
                    </Text>

                    <TextInput
                        mode="outlined"
                        label="Ad Soyad"
                        value={editFullName}
                        onChangeText={setEditFullName}
                        style={{ marginBottom: 16 }}
                    />

                    <Divider style={{ marginVertical: 8 }} />

                    {currentUser?.role === 'super_admin' && (
                        <>
                            <Text variant="labelLarge" style={{ marginBottom: 8 }}>
                                Yetki Seviyesi
                            </Text>
                            <SegmentedButtons
                                value={editRole}
                                onValueChange={(value) => setEditRole(value as UserRole)}
                                buttons={[
                                    { value: 'user', label: 'Kullanıcı' },
                                    { value: 'admin', label: 'Admin' },
                                    { value: 'super_admin', label: 'Süper' },
                                ]}
                            />
                            <Divider style={{ marginVertical: 8 }} />
                        </>
                    )}

                    <Text variant="labelLarge" style={{ marginBottom: 8 }}>
                        Meslek
                    </Text>
                    <RadioButton.Group
                        onValueChange={(value) => setEditStaffRole(value as StaffRole)}
                        value={editStaffRole}
                    >
                        {STAFF_ROLES.map((role) => (
                            <RadioButton.Item
                                key={role.id}
                                label={role.labelTr}
                                value={role.id}
                                style={styles.radioItem}
                            />
                        ))}
                    </RadioButton.Group>

                    <Divider style={{ marginVertical: 8 }} />

                    <Text variant="labelLarge" style={{ marginBottom: 8 }}>
                        Rotasyon Grubu
                    </Text>
                    <SegmentedButtons
                        value={editRotationGroup}
                        onValueChange={(value) => setEditRotationGroup(value as RotationGroup)}
                        buttons={[
                            { value: 'A', label: 'Grup A' },
                            { value: 'B', label: 'Grup B' },
                            { value: 'C', label: 'Grup C' },
                        ]}
                    />

                    <View style={styles.modalActions}>
                        <Button
                            mode="text"
                            onPress={async () => {
                                if (!editingUser) return;
                                setSaving(true);
                                try {
                                    await syncUserShiftRoles(editingUser.id, editStaffRole);
                                    Alert.alert('Bilgi', 'Tüm vardiyalar seçili mesleğe göre güncellendi.');
                                } catch (e: any) {
                                    Alert.alert('Hata', e.message);
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            textColor={theme.colors.primary}
                            compact
                            disabled={saving}
                        >
                            Vardiyaları Eşitle
                        </Button>
                    </View>

                    <View style={styles.modalActions}>
                        <Button
                            mode="outlined"
                            onPress={() => setEditModalVisible(false)}
                            style={{ flex: 1 }}
                        >
                            İptal
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSaveEdit}
                            loading={saving}
                            style={{ flex: 1 }}
                        >
                            Kaydet
                        </Button>
                    </View>
                </Modal>
            </Portal>

            <Portal>
                <Dialog visible={confirmDialogVisible} onDismiss={() => setConfirmDialogVisible(false)} style={{ backgroundColor: theme.colors.surface }}>
                    <Dialog.Title>{confirmTitle}</Dialog.Title>
                    <Dialog.Content>
                        <Paragraph>{confirmMessage}</Paragraph>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDialogVisible(false)}>İptal</Button>
                        <Button onPress={executeConfirmAction} textColor={isDestructive ? theme.colors.error : theme.colors.primary}>
                            {confirmButtonText}
                        </Button>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingTop: 0,
        gap: 12,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
    },
    userInfo: {
        flex: 1,
        gap: 4,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleChip: {
        alignSelf: 'flex-start',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
    },
    radioItem: {
        paddingVertical: 4,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
});
