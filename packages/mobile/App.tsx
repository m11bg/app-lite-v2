import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { GlobalDialog } from './src/components/common/GlobalDialog';
import { AuthProvider } from '@/context/AuthContext';
// import { lightTheme, darkTheme } from '@/styles/theme';
import { lightTheme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';
import { initSentry } from '@/utils/sentry';
import { RootStackParamList } from '@/types';

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [Linking.createURL('/'), 'applite://'],
    config: {
        screens: {
            Auth: {
                screens: {
                    ResetPassword: 'reset-password/:token',
                },
            },
        },
    },
};

const App: React.FC = () => {
    // Desativado detecção de esquema de cores para manter apenas Light Theme
    // const colorScheme = useColorScheme();
    const paperTheme = lightTheme;
    const navigationTheme = NavigationDefaultTheme;
    useEffect(() => {
        // Inicializa Sentry assim que o app sobe. Se DSN não estiver setado, será no-op.
        initSentry();
    }, []);
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={paperTheme}>
                <SafeAreaProvider>
                    <AuthProvider>
                        <NavigationContainer theme={navigationTheme} ref={navigationRef} linking={linking}>
                            <RootNavigator />
                        </NavigationContainer>
                        <GlobalDialog />
                    </AuthProvider>
                </SafeAreaProvider>
            </PaperProvider>
        </GestureHandlerRootView>
    );
};

export default App;
