import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExpoConfig, ConfigContext } from 'expo/config';

// Explicitly load .env from project root
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: 'Acil Servis Nöbet Sistemi',
    slug: 'acil-servis-nobet-sistemi',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'nobet-sistemi',
    userInterfaceStyle: 'automatic',
    splash: {
        backgroundColor: '#0056b3',
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.isd112.acilservisnobet',
    },
    android: {
        package: 'com.isd112.acilservisnobet',
    },
    web: {
        bundler: 'metro',
    },
    plugins: ['expo-router'],
    extra: {
        firebaseApiKey: process.env.FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.FIREBASE_APP_ID,
        firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
    },
});
