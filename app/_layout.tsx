/**
 * Root Layout
 * 
 * Main entry point for the app. Sets up providers and routing.
 */

import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Image } from 'react-native';
import { PaperProvider, ActivityIndicator, Text } from 'react-native-paper';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { theme } from '@/src/theme';

/**
 * Navigation Guard Component
 * Handles auth-based routing including approval status
 */
function NavigationGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, isApproved } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';
        const inPendingApproval = segments[0] === 'pending-approval';

        if (!isAuthenticated && !inAuthGroup) {
            // Not authenticated -> go to login
            router.replace('/(auth)/login');
        } else if (isAuthenticated && inAuthGroup) {
            // Authenticated but in auth group -> check approval
            if (isApproved) {
                router.replace('/(tabs)');
            } else {
                router.replace('/pending-approval');
            }
        } else if (isAuthenticated && !isApproved && !inPendingApproval) {
            // Authenticated but not approved and not on pending page -> go to pending
            router.replace('/pending-approval');
        } else if (isAuthenticated && isApproved && inPendingApproval) {
            // Approved but still on pending page -> go to main app
            router.replace('/(tabs)');
        }
    }, [isAuthenticated, isLoading, isApproved, segments]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>Yükleniyor...</Text>
            </View>
        );
    }

    return <>{children}</>;
}

/**
 * Root Layout
 */
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [loaded, error] = useFonts({
        ...MaterialCommunityIcons.font,
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={theme}>
                <AuthProvider>
                    <NavigationGuard>
                        <Slot />
                    </NavigationGuard>
                    <StatusBar style="auto" />
                </AuthProvider>
            </PaperProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
});
