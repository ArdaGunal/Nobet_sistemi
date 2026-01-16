/**
 * Login Screen
 * 
 * Google Sign-In only authentication screen.
 */

import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, useTheme, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
    const { loginWithGoogle, isLoading } = useAuth();
    const theme = useTheme();

    const [error, setError] = useState('');
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleGoogleLogin = async () => {
        setIsSigningIn(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err: any) {
            setError(err.message || 'Giriş yapılamadı');
        } finally {
            setIsSigningIn(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={{ marginTop: 16 }}>Yükleniyor...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]} elevation={4}>
                        <Text variant="displayMedium" style={{ color: theme.colors.onPrimary }}>+</Text>
                    </Surface>
                    <Text variant="headlineMedium" style={styles.title}>
                        Acil Servis
                    </Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>
                        Nöbet Takip Sistemi
                    </Text>
                </View>

                {/* Login Section */}
                <View style={styles.loginSection}>
                    <Text variant="bodyLarge" style={styles.welcomeText}>
                        Hoş Geldiniz
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.secondary, textAlign: 'center', marginBottom: 32 }}>
                        Devam etmek için Google hesabınızla giriş yapın
                    </Text>

                    {error ? (
                        <Surface style={styles.errorContainer} elevation={0}>
                            <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
                                {error}
                            </Text>
                        </Surface>
                    ) : null}

                    <Button
                        mode="contained"
                        onPress={handleGoogleLogin}
                        loading={isSigningIn}
                        disabled={isSigningIn}
                        icon="google"
                        style={styles.googleButton}
                        contentStyle={styles.googleButtonContent}
                        labelStyle={styles.googleButtonLabel}
                    >
                        Google ile Giriş Yap
                    </Button>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                        © 2026 Acil Servis Nöbet Sistemi
                    </Text>
                </View>
            </View>
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
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontWeight: 'bold',
        marginTop: 20,
        color: '#0056b3',
    },
    loginSection: {
        alignItems: 'center',
    },
    welcomeText: {
        fontWeight: '600',
        marginBottom: 8,
    },
    errorContainer: {
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
    },
    googleButton: {
        width: '100%',
        borderRadius: 12,
        backgroundColor: '#4285F4',
    },
    googleButtonContent: {
        height: 56,
        flexDirection: 'row-reverse',
    },
    googleButtonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
        paddingTop: 32,
    },
});
