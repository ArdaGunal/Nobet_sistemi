/**
 * Pending Approval Screen
 * 
 * Shown to users who have logged in but are not yet approved by an admin.
 * If user hasn't requested approval yet, shows terms checkbox + send request button.
 * If user has requested, shows waiting message.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Button, useTheme, Surface, ActivityIndicator, Checkbox, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function PendingApprovalScreen() {
    const { user, logout, isLoading, hasRequestedApproval, requestApproval } = useAuth();
    const theme = useTheme();

    const [termsAccepted, setTermsAccepted] = useState(false);
    const [termsModalVisible, setTermsModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleRequestApproval = async () => {
        if (!termsAccepted) {
            setError('Lütfen kullanım koşullarını okuyup kabul edin.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await requestApproval();
        } catch (err: any) {
            setError(err.message || 'İstek gönderilemedi');
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    // User has NOT requested approval yet - show terms + button
    if (!hasRequestedApproval) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.content}>
                        {/* Icon */}
                        <Surface style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]} elevation={2}>
                            <Text style={styles.icon}>📝</Text>
                        </Surface>

                        {/* Title */}
                        <Text variant="headlineMedium" style={styles.title}>
                            Kayıt İsteği
                        </Text>

                        {/* Description */}
                        <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.secondary }]}>
                            Sisteme erişim için yönetici onayı gereklidir.
                        </Text>

                        {/* User Info Card */}
                        <Surface style={styles.userCard} elevation={1}>
                            <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
                                Giriş yapan hesap
                            </Text>
                            <Text variant="titleMedium" style={{ fontWeight: '600', marginTop: 4 }}>
                                {user?.fullName || 'İsimsiz Kullanıcı'}
                            </Text>
                            <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                                {user?.email}
                            </Text>
                        </Surface>

                        {/* Checkbox with clickable terms link */}
                        <View style={styles.checkboxContainer}>
                            <Checkbox.Android
                                status={termsAccepted ? 'checked' : 'unchecked'}
                                onPress={() => {
                                    setTermsAccepted(!termsAccepted);
                                    setError('');
                                }}
                                color={theme.colors.primary}
                            />
                            <View style={{ flex: 1, marginLeft: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => setTermsModalVisible(true)}>
                                    <Text style={[styles.termsLink, { color: theme.colors.primary }]}>
                                        Kullanım Koşulları
                                    </Text>
                                </TouchableOpacity>
                                <Text variant="bodyMedium">'nı okudum ve kabul ediyorum.</Text>
                            </View>
                        </View>

                        {/* Error Message */}
                        {error ? (
                            <Surface style={styles.errorContainer} elevation={0}>
                                <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
                                    {error}
                                </Text>
                            </Surface>
                        ) : null}

                        {/* Submit Button */}
                        <Button
                            mode="contained"
                            onPress={handleRequestApproval}
                            loading={submitting}
                            disabled={submitting || !termsAccepted}
                            style={[styles.submitButton, { backgroundColor: termsAccepted ? theme.colors.primary : '#9ca3af' }]}
                            contentStyle={styles.submitButtonContent}
                            icon="send"
                        >
                            Kayıt İsteği Gönder
                        </Button>

                        {/* Logout Button */}
                        <Button
                            mode="text"
                            onPress={handleLogout}
                            style={styles.logoutButton}
                        >
                            Farklı Hesapla Giriş Yap
                        </Button>
                    </View>
                </ScrollView>

                {/* Terms Modal */}
                <Portal>
                    <Modal
                        visible={termsModalVisible}
                        onDismiss={() => setTermsModalVisible(false)}
                        contentContainerStyle={[styles.termsModal, { backgroundColor: theme.colors.surface }]}
                    >
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
                                📋 Kullanım Koşulları
                            </Text>

                            <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.primary }}>
                                1. Genel Hükümler
                            </Text>
                            <Text variant="bodyMedium" style={styles.termsText}>
                                Bu sistem, Acil Servis Nöbet Takip uygulaması olup sadece yetkili personel tarafından kullanılabilir. Sisteme erişim için yönetici onayı zorunludur.
                            </Text>

                            <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8, marginTop: 16, color: theme.colors.primary }}>
                                2. Kişisel Verilerin Korunması
                            </Text>
                            <Text variant="bodyMedium" style={styles.termsText}>
                                Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında işlenmekte ve korunmaktadır. Verileriniz üçüncü şahıslarla paylaşılmaz.
                            </Text>

                            <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8, marginTop: 16, color: theme.colors.primary }}>
                                3. Kullanım Şartları
                            </Text>
                            <Text variant="bodyMedium" style={styles.termsText}>
                                • Sistem üzerindeki tüm işlemler kayıt altına alınmaktadır.{'\n'}
                                • Yetkisiz erişim girişimleri yasal işlem başlatılmasına neden olabilir.{'\n'}
                                • Hesabınızı başkalarıyla paylaşmanız yasaktır.{'\n'}
                                • Sistem verilerini kötüye kullanmak yasaktır.
                            </Text>

                            <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8, marginTop: 16, color: theme.colors.primary }}>
                                4. Sorumluluk
                            </Text>
                            <Text variant="bodyMedium" style={styles.termsText}>
                                Kullanıcılar, sistem üzerindeki tüm eylemlerinden kendileri sorumludur. Yanlış veya eksik bilgi girişinden doğacak sorunlardan yönetim sorumlu tutulamaz.
                            </Text>

                            <Button
                                mode="contained"
                                onPress={() => setTermsModalVisible(false)}
                                style={{ marginTop: 24, borderRadius: 8 }}
                            >
                                Tamam
                            </Button>
                        </ScrollView>
                    </Modal>
                </Portal>
            </SafeAreaView>
        );
    }

    // User HAS requested approval - show waiting message
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                {/* Icon */}
                <Surface style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]} elevation={2}>
                    <Text style={styles.icon}>⏳</Text>
                </Surface>

                {/* Title */}
                <Text variant="headlineMedium" style={styles.titleWaiting}>
                    Onay Bekleniyor
                </Text>

                {/* Description */}
                <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.secondary }]}>
                    Kayıt isteğiniz alındı! Yöneticiniz hesabınızı onayladığında sisteme erişebileceksiniz.
                </Text>

                {/* User Info Card */}
                <Surface style={styles.userCard} elevation={1}>
                    <Text variant="labelMedium" style={{ color: theme.colors.secondary }}>
                        Giriş yapan hesap
                    </Text>
                    <Text variant="titleMedium" style={{ fontWeight: '600', marginTop: 4 }}>
                        {user?.fullName || 'İsimsiz Kullanıcı'}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>
                        {user?.email}
                    </Text>
                </Surface>

                {/* Info Box */}
                <Surface style={[styles.infoBox, { backgroundColor: '#eff6ff' }]} elevation={0}>
                    <Text variant="bodyMedium" style={{ color: '#1e40af', textAlign: 'center' }}>
                        💡 Yöneticiniz size bir meslek (Sağlıkçı, Sürücü veya Paramedik) atayacak ve hesabınızı onaylayacaktır.
                    </Text>
                </Surface>

                {/* Logout Button */}
                <Button
                    mode="outlined"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                    icon="logout"
                >
                    Farklı Hesapla Giriş Yap
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: {
        fontSize: 48,
    },
    title: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
        color: '#3b82f6',
    },
    titleWaiting: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
        color: '#f59e0b',
    },
    description: {
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    userCard: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        marginBottom: 24,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    termsLink: {
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        fontSize: 14,
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
    },
    submitButton: {
        width: '100%',
        borderRadius: 12,
        marginBottom: 12,
    },
    submitButtonContent: {
        height: 52,
    },
    infoBox: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 32,
    },
    logoutButton: {
        borderRadius: 8,
    },
    termsModal: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
        maxHeight: '80%',
    },
    termsText: {
        color: '#374151',
        lineHeight: 22,
    },
});
