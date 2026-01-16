import { MD3LightTheme as DefaultTheme, configureFonts } from 'react-native-paper';

export const theme = {
    ...DefaultTheme,
    colors: {
        ...DefaultTheme.colors,
        primary: '#0056b3', // İsdemir Corporate Blue
        secondary: '#003366', // Darker Blue
        background: '#f8fafc',
        surface: '#ffffff',
        error: '#ef4444',
        text: '#1e293b',
        onPrimary: '#ffffff',
        gridRow: '#f1f5f9', // Custom color for tables
    },
    // Custom font config can be added here
};
