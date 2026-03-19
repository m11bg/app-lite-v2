import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { GlobalDialog } from './src/components/common/GlobalDialog';
import { AuthProvider } from '@/context/AuthContext';
import { ProfilePreviewProvider } from '@/context/ProfilePreviewContext';
import { ChatProvider } from '@/context/chat/ChatProvider';
// import { lightTheme, darkTheme } from '@/styles/theme';
import { lightTheme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';
import { initSentry } from '@/utils/sentry';
import { RootStackParamList } from '@/types';

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [Linking.createURL('/'), 'applite://'],
    config: {
        screens: {
            Main: {
                path: 'Main',
                screens: {
                    Ofertas: {
                        path: 'Ofertas',
                        screens: {
                            SwipeOfertas: 'SwipeOfertas',
                            BuscarOfertas: 'BuscarOfertas',
                            OfferDetail: 'OfferDetail',
                            CreateOferta: 'CreateOferta',
                            EditOferta: 'EditOferta',
                            PublicProfile: {
                                path: 'PublicProfile/:userId',
                                parse: {
                                    userId: (userId: string) => userId,
                                },
                            },
                        },
                    },
                    Agenda: 'Agenda',
                    Chat: {
                        path: 'Chat',
                        screens: {
                            ChatList: 'ChatList',
                            ConversationDetail: 'ConversationDetail/:conversationId',
                        },
                    },
                    Comunidade: 'Comunidade',
                    Perfil: {
                        path: 'Perfil',
                        screens: {
                            ProfileHome: 'ProfileHome',
                            Settings: 'Settings',
                            Notifications: 'Notifications',
                            EditProfile: 'EditProfile',
                            ChangePassword: 'ChangePassword',
                            EditProfileDocument: 'EditProfileDocument',
                            EditProfileCompany: 'EditProfileCompany',
                        },
                    },
                },
            },
            NotFound: '*',
            Auth: {
                screens: {
                    Login: 'Login',
                    ForgotPassword: 'ForgotPassword',
                    ResetPassword: {
                        path: 'reset-password/:token?',
                        parse: {
                            token: (token: string) => token || '',
                        },
                    },
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
            <SafeAreaProvider>
                <AuthProvider>
                    <ChatProvider>
                        <PaperProvider theme={paperTheme}>
                            <NavigationContainer theme={navigationTheme} ref={navigationRef} linking={linking}>
                                <ProfilePreviewProvider>
                                    <RootNavigator />
                                </ProfilePreviewProvider>
                            </NavigationContainer>
                            <GlobalDialog />
                        </PaperProvider>
                    </ChatProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
};

export default App;
