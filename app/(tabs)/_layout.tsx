import React, { useState, useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Home, Settings, Users, Calendar, ClipboardList, MessageCircle, FileText, Menu, Megaphone } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme, Text, Snackbar } from 'react-native-paper';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity } from 'react-native';
import { subscribeToUsers } from '@/src/services/userService';
import { subscribeToUnreadCount } from '@/src/services/chatService';
import { subscribeToPendingRequests } from '@/src/services/requestService';
import { subscribeToAnnouncements } from '@/src/services/announcementService';
import { subscribeToSwapRequests, subscribeToAdminSwapRequests } from '@/src/services/swapService';
import { subscribeToPersonalNotifications, getUnreadCount } from '@/src/services/personalNotificationService';
import { Announcement } from '@/src/types';

// Badge component for drawer icons
const IconWithBadge = ({
    icon: Icon,
    color,
    size,
    badgeCount,
}: {
    icon: React.ElementType;
    color: string;
    size: number;
    badgeCount: number;
}) => (
    <View>
        <Icon size={size} color={color} />
        {badgeCount > 0 && (
            <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                </Text>
            </View>
        )}
    </View>
);

// Custom Drawer Content
function CustomDrawerContent(props: any) {
    const { user, isAdmin } = useAuth();
    const theme = useTheme();

    return (
        <View style={styles.drawerContainer}>
            {/* Header */}
            <View style={[styles.drawerHeader, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.drawerTitle}>Acil Servis</Text>
                <Text style={styles.drawerSubtitle}>Nöbet Sistemi</Text>
                {user && (
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.fullName}</Text>
                        <Text style={styles.userRole}>
                            {isAdmin ? '👑 Yönetici' : '👤 Personel'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Menu Items */}
            <DrawerContentScrollView {...props} contentContainerStyle={styles.menuContent}>
                <DrawerItemList {...props} />
            </DrawerContentScrollView>
        </View>
    );
}

export default function DrawerLayout() {
    const theme = useTheme();
    const router = useRouter();
    const { isAdmin, user } = useAuth();
    const dimensions = useWindowDimensions();
    const drawerWidth = 280;

    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [pendingSwaps, setPendingSwaps] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [pendingAdminSwapsCount, setPendingAdminSwapsCount] = useState(0);
    const [pendingUserRequestsCount, setPendingUserRequestsCount] = useState(0);
    const [unreadAnnouncementsCount, setUnreadAnnouncementsCount] = useState(0);
    const [unreadPersonalCount, setUnreadPersonalCount] = useState(0);
    const [lastPersonalNotificationTime, setLastPersonalNotificationTime] = useState<string | null>(null);

    // Snackbar for new announcements
    const [snackbarVisible, setSnackbarVisible] = useState(false);
    const [lastAnnouncementTitle, setLastAnnouncementTitle] = useState('');

    // Calculate total notifications for the hamburger menu
    const totalNotifications = unreadMessagesCount + unreadAnnouncementsCount + unreadPersonalCount + pendingSwaps;
    const totalRequestsBadge = pendingRequestsCount + pendingAdminSwapsCount + pendingUserRequestsCount;

    useEffect(() => {
        if (!user) return;

        // Chat notification
        const unsubChat = subscribeToUnreadCount(user.id, user.role || 'user', (count) => {
            setUnreadMessagesCount(count);
        });

        // Announcement notification
        let isFirstLoad = true;
        const unsubAnnounce = subscribeToAnnouncements((data) => {
            // Only count GENERAL announcements (no targetUserId and no notificationType)
            const generalAnnouncements = data.filter(a => !a.targetUserId && !a.notificationType);
            const unreadGeneral = generalAnnouncements.filter(a => !a.readBy?.includes(user.id));

            // Note: We'll combine this count with personal notifications in a separate effect or state
            // For now, let's keep using the state variable but rename logic slightly
            setUnreadAnnouncementsCount(prev => {
                // This is tricky because we have two subscriptions updating one number.
                // Better approach: Separate states.
                return unreadGeneral.length;
            });

            if (unreadGeneral.length > 0) {
                const latest = unreadGeneral[0];
                if (isFirstLoad || latest.title !== lastAnnouncementTitle) {
                    setLastAnnouncementTitle(latest.title);
                    setSnackbarVisible(true);
                }
            }
            isFirstLoad = false;
        });

        // Subscribe to Personal Notifications (User Subcollection)
        const unsubPersonal = subscribeToPersonalNotifications(user.id, (notes) => {
            const unreadPersonal = getUnreadCount(notes);
            setUnreadPersonalCount(unreadPersonal);

            if (unreadPersonal > 0 && notes.length > 0) {
                // Show snackbar for new personal notification
                // Ideally check if it's new, but for now simple check
                const latest = notes[0];
                if (latest.createdAt > (lastPersonalNotificationTime || '')) {
                    setLastPersonalNotificationTime(latest.createdAt);
                    setSnackbarVisible(true);
                }
            }
        });

        // Subscribe to swap requests
        const unsubscribeSwaps = subscribeToSwapRequests(user.id, (swaps) => {
            const pending = swaps.filter(s => s.status === 'pending_user' && s.expiresAt > Date.now());
            setPendingSwaps(pending.length);
        });

        return () => {
            if (typeof unsubChat === 'function') unsubChat();
            unsubAnnounce();
            unsubPersonal();
            unsubscribeSwaps();
        };
    }, [user, lastAnnouncementTitle, lastPersonalNotificationTime]);

    useEffect(() => {
        // Only fetch pending requests if admin
        if (isAdmin) {
            const unsubRequests = subscribeToPendingRequests((requests) => {
                setPendingRequestsCount(requests.length);
            });

            // Subscribe to pending SWAP requests for admin
            const unsubSwaps = subscribeToAdminSwapRequests((swaps) => {
                setPendingAdminSwapsCount(swaps.length);
            });

            // Subscribe to pending USER requests for admin
            const unsubUsers = subscribeToUsers((users) => {
                const pendingUsers = users.filter(u => !u.isApproved && u.role === 'user');
                setPendingUserRequestsCount(pendingUsers.length);
            });

            return () => {
                unsubRequests();
                unsubSwaps();
                unsubUsers();
            };
        }
    }, [isAdmin]);

    return (
        <>
            <Drawer
                drawerContent={(props) => <CustomDrawerContent {...props} />}
                screenOptions={({ navigation }) => ({
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: theme.colors.primary,
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerLeft: () => {
                        const hasNotifications = (isAdmin && totalRequestsBadge > 0) || totalNotifications > 0;

                        return (
                            <TouchableOpacity
                                onPress={() => navigation.toggleDrawer()}
                                style={{ marginLeft: 16, padding: 4 }}
                            >
                                <Menu color="#fff" size={24} />
                                {hasNotifications && (
                                    <View style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: -2,
                                        backgroundColor: '#ef4444',
                                        borderRadius: 6,
                                        minWidth: 12,
                                        height: 12,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }} />
                                )}
                            </TouchableOpacity>
                        );
                    },
                    drawerActiveTintColor: theme.colors.primary,
                    drawerInactiveTintColor: '#64748b',
                    drawerActiveBackgroundColor: theme.colors.primary + '15',
                    drawerStyle: {
                        backgroundColor: '#ffffff',
                        width: drawerWidth,
                    },
                    drawerLabelStyle: {
                        fontSize: 15,
                        fontWeight: '500',
                        marginLeft: -8,
                    },
                    drawerItemStyle: {
                        borderRadius: 12,
                        marginHorizontal: 12,
                        marginVertical: 2,
                    },
                })}
            >
                {/* Dashboard - Visible to all users */}
                <Drawer.Screen
                    name="index"
                    options={{
                        drawerLabel: pendingSwaps > 0 ? `Ana Sayfa (${pendingSwaps})` : 'Ana Sayfa',
                        title: 'Nöbet Listesi',
                        drawerIcon: ({ color, size }) => (
                            <IconWithBadge
                                icon={Home}
                                color={color}
                                size={size}
                                badgeCount={pendingSwaps}
                            />
                        ),
                    }}
                />

                {/* Announcements - Visible to all */}
                <Drawer.Screen
                    name="announcements"
                    options={{
                        drawerLabel: unreadAnnouncementsCount > 0 ? `Duyurular (${unreadAnnouncementsCount})` : 'Duyurular',
                        title: 'Duyurular',
                        drawerIcon: ({ color, size }) => (
                            <IconWithBadge
                                icon={Megaphone}
                                color={color}
                                size={size}
                                badgeCount={unreadAnnouncementsCount}
                            />
                        ),
                    }}
                />

                {/* Schedule Calendar - Admin only */}
                <Drawer.Screen
                    name="schedule"
                    options={{
                        drawerLabel: 'Atamalar',
                        title: 'Vardiya Atamaları',
                        drawerIcon: ({ color, size }) => <Calendar size={size} color={color} />,
                        drawerItemStyle: { display: isAdmin ? 'flex' : 'none' }
                    }}
                />

                {/* Messages - Visible to everyone */}
                <Drawer.Screen
                    name="messages"
                    options={{
                        drawerLabel: unreadMessagesCount > 0
                            ? (isAdmin ? `Mesajlar (${unreadMessagesCount})` : `Destek (${unreadMessagesCount})`)
                            : (isAdmin ? 'Mesajlar' : 'Destek'),
                        title: isAdmin ? 'Mesajlar' : 'Destek',
                        drawerIcon: ({ color, size }) => (
                            <IconWithBadge
                                icon={MessageCircle}
                                color={color}
                                size={size}
                                badgeCount={unreadMessagesCount}
                            />
                        ),
                    }}
                />

                {/* Requests Management - Admin only */}
                <Drawer.Screen
                    name="requests"
                    options={{
                        drawerLabel: totalRequestsBadge > 0 ? `İstekler (${totalRequestsBadge})` : 'İstekler',
                        title: 'İstek Yönetimi',
                        drawerIcon: ({ color, size }) => (
                            <IconWithBadge
                                icon={FileText}
                                color={color}
                                size={size}
                                badgeCount={totalRequestsBadge}
                            />
                        ),
                        drawerItemStyle: { display: isAdmin ? 'flex' : 'none' }
                    }}
                />

                {/* Quick Shift Add - Admin only */}
                <Drawer.Screen
                    name="admin"
                    options={{
                        drawerLabel: 'Hızlı Nöbet Ekle',
                        title: 'Hızlı Nöbet Ekle',
                        drawerIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
                        drawerItemStyle: { display: isAdmin ? 'flex' : 'none' }
                    }}
                />

                {/* User Management - Admin only */}
                <Drawer.Screen
                    name="users"
                    options={{
                        drawerLabel: 'Kullanıcılar',
                        title: 'Kullanıcı Yönetimi',
                        drawerIcon: ({ color, size }) => <Users size={size} color={color} />,
                        drawerItemStyle: { display: isAdmin ? 'flex' : 'none' }
                    }}
                />

            </Drawer>

            <Snackbar
                visible={snackbarVisible && (unreadAnnouncementsCount > 0 || pendingSwaps > 0)}
                onDismiss={() => setSnackbarVisible(false)}
                duration={5000}
                action={{
                    label: 'Görüntüle',
                    onPress: () => {
                        // Eğer swap ise dashboard'a, duyuru ise duyurulara yönlendir
                        if (pendingSwaps > 0) router.push('/(tabs)/');
                        else router.push('/(tabs)/announcements');
                        setSnackbarVisible(false);
                    },
                }}
                style={{ backgroundColor: '#1e293b', position: 'absolute', top: 60, left: 16, right: 16, zIndex: 99999, borderRadius: 8 }}
                wrapperStyle={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 99999 }}
            >
                {pendingSwaps > 0 ? 'Yeni Vardiya Takas İsteğiniz Var!' : (lastAnnouncementTitle ? `Yeni Duyuru: ${lastAnnouncementTitle}` : 'Yeni bildiriminiz var')}
            </Snackbar>
        </>
    );
}

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    drawerHeader: {
        paddingTop: 48,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    drawerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    drawerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    userInfo: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    userRole: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    menuContent: {
        paddingTop: 8,
    },
    badgeContainer: {
        position: 'absolute',
        top: -6,
        right: -8,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
