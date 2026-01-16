import React from 'react';
import { Platform, View, ViewStyle, StyleProp } from 'react-native';
import { Tooltip } from 'react-native-paper';

interface AppTooltipProps {
    title: string;
    children: React.ReactElement;
    style?: StyleProp<ViewStyle>;
}

/**
 * AppTooltip
 * 
 * Provides a reliable tooltip for Web using the native 'title' attribute,
 * which fixes 'sticky' tooltip issues on simpler implementations.
 * On Mobile, it uses React Native Paper's Tooltip.
 */
export const AppTooltip = ({ title, children, style }: AppTooltipProps) => {
    if (Platform.OS === 'web') {
        // On Web, View emits a div. We need to set the 'title' attribute on it.
        // React Native Web 0.19+ refs forward to the DOM element.
        const viewRef = React.useRef<any>(null);

        React.useEffect(() => {
            const element = viewRef.current;
            if (element) {
                // If it's a DOM node (HTMLElement), set title directly
                if (element instanceof HTMLElement) {
                    element.title = title;
                }
                // Fallback for older RNW or wrapped components
                else if (typeof element.setAttribute === 'function') {
                    element.setAttribute('title', title);
                }
                // Legacy RNW support
                else if (typeof element.setNativeProps === 'function') {
                    element.setNativeProps({ title });
                }
            }
        }, [title]);

        return (
            <View
                ref={viewRef}
                style={style}
                // Attempt to pass title prop directly as well, as some versions might pass it through
                {...({ title } as any)}
            >
                {children}
            </View>
        );
    }

    // On Mobile, use Paper's Tooltip. 
    return (
        <Tooltip title={title}>
            <View style={style}>
                {children}
            </View>
        </Tooltip>
    );
};
