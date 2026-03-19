import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
type IconName = React.ComponentProps<typeof Icon>['name'];
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscarOfertasScreen from '../screens/app/BuscarOfertasScreen';
import AgendaScreen from '../screens/app/AgendaScreen';
import CommunityScreen from '../screens/app/CommunityScreen';
import ProfileNavigator from './ProfileNavigator';
import { MainTabParamList, OfertasStackParamList, ChatStackParamList } from '@/types';
import { colors } from '@/styles/theme';
import CriarOfertaScreen from '@/screens/app/CriarOfertaScreen';
import OfertaDetalheScreen from '@/screens/app/OfertaDetalheScreen';
import PublicProfileScreen from '@/screens/app/PublicProfileScreen';
import RequireAuth from '@/navigation/guards/RequireAuth';
import SwipeOfertasScreen from '@/screens/app/SwipeOfertasScreen';
import ConversationListScreen from '@/screens/app/Chat/ConversationListScreen';
import ConversationDetailScreen from '@/screens/app/Chat/ConversationDetailScreen';
import { useConversationList } from '@/context/chat/ConversationListContext';

const Tab = createBottomTabNavigator<MainTabParamList>();
const OfertasStack = createNativeStackNavigator<OfertasStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();

/**
 * Componente de navegação em pilha para a funcionalidade de Ofertas.
 * Este navegador lida com o fluxo de descoberta, busca, criação, detalhamento e edição de ofertas.
 * Utiliza o Native Stack Navigator para transições de tela nativas.
 * 
 * @returns {JSX.Element} O navegador de pilha de ofertas configurado com suas respectivas telas e guardas de autenticação.
 */
const OfertasNavigator = () => (
    <OfertasStack.Navigator initialRouteName="SwipeOfertas">
        {/* Tela de descoberta de ofertas (estilo Tinder) - Acesso livre (sem exigir login) */}
        <OfertasStack.Screen
            name="SwipeOfertas"
            component={SwipeOfertasScreen}
            options={{ title: 'Descobrir Ofertas' }}
        />
        {/* Tela de busca de ofertas por filtros/texto */}
        <OfertasStack.Screen
            name="BuscarOfertas"
            component={BuscarOfertasScreen}
            options={{ title: 'Buscar Serviços' }}
        />
        {/* Tela de criação de nova oferta - Requer Autenticação */}
        <OfertasStack.Screen
            name="CreateOferta"
            options={{ title: 'Criar Oferta' }}
            children={(props) => (
                <RequireAuth>
                    <CriarOfertaScreen {...props} />
                </RequireAuth>
            )}
        />
        {/* Tela de detalhes de uma oferta específica */}
        <OfertasStack.Screen
            name="OfferDetail"
            component={OfertaDetalheScreen}
            options={{ title: 'Detalhe da Oferta' }}
        />
        {/* Tela de edição de oferta existente - Requer Autenticação e Carregamento Dinâmico */}
        <OfertasStack.Screen
            name="EditOferta"
            options={{ title: 'Editar Oferta' }}
            children={(props) => (
                <RequireAuth>
                    {React.createElement(require('@/screens/app/EditarOfertaScreen').default, props)}
                </RequireAuth>
            )}
        />
        {/* Tela de perfil público de outro usuário - Acessada via preview do prestador */}
        <OfertasStack.Screen
            name="PublicProfile"
            component={PublicProfileScreen}
            options={{ title: 'Perfil do Prestador' }}
        />
    </OfertasStack.Navigator>
);

/**
 * Componente de navegação em pilha para a funcionalidade de Chat.
 * Contém a lista de conversas e a tela de detalhes de conversa.
 * Todas as telas exigem autenticação via RequireAuth.
 */
const ChatNavigator = () => (
    <ChatStack.Navigator initialRouteName="ChatList">
        <ChatStack.Screen
            name="ChatList"
            options={{ title: 'Conversas' }}
            children={(props) => (
                <RequireAuth>
                    <ConversationListScreen {...props} />
                </RequireAuth>
            )}
        />
        <ChatStack.Screen
            name="ConversationDetail"
            component={ConversationDetailScreen}
            options={{ title: 'Chat' }}
        />
    </ChatStack.Navigator>
);

/**
 * Navegador de abas inferior principal (Bottom Tab Navigator).
 * Define a navegação de nível superior do aplicativo após o login,
 * organizando as principais seções (Ofertas, Agenda, Chat, Comunidade e Perfil).
 * 
 * @component
 * @returns {React.FC} Componente Funcional do React que renderiza o navegador de abas.
 */
const MainTabNavigator: React.FC = () => {
    // Obtém o total de não-lidas para badge na tab de Chat
    const { totalUnread } = useConversationList();
    return (
        <Tab.Navigator
            initialRouteName="Ofertas"
            screenOptions={({ route }) => ({
                /**
                 * Configuração dinâmica do ícone da aba.
                 * Alterna entre ícones preenchidos e contornados baseando-se no estado de foco.
                 */
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: IconName;

                    // Mapeamento de rotas para seus respectivos ícones do MaterialCommunityIcons
                    switch (route.name) {
                        case 'Ofertas':
                            iconName = focused ? 'store' : 'store-outline';
                            break;
                        case 'Agenda':
                            iconName = focused ? 'calendar' : 'calendar-outline';
                            break;
                        case 'Chat':
                            iconName = focused ? 'chat' : 'chat-outline';
                            break;
                        case 'Comunidade':
                            iconName = focused ? 'account-group' : 'account-group-outline';
                            break;
                        case 'Perfil':
                            iconName = focused ? 'account' : 'account-outline';
                            break;
                        default:
                            iconName = 'help-circle';
                    }

                    return <Icon name={iconName} size={size} color={color} />;
                },
                // Cores do tema aplicadas aos ícones e labels das abas
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                headerShown: false, // Cabeçalho oculto por padrão nas abas, gerenciado individualmente nas pilhas
            })}
        >
            {/* Definição das abas individuais */}
            <Tab.Screen name="Ofertas" component={OfertasNavigator} />
            <Tab.Screen name="Agenda" component={AgendaScreen} />
            <Tab.Screen
                name="Chat"
                component={ChatNavigator}
                options={{
                    tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
                    tabBarBadgeStyle: { backgroundColor: colors.primary, fontSize: 10 },
                }}
            />
            <Tab.Screen name="Comunidade" component={CommunityScreen} />
            <Tab.Screen name="Perfil" component={ProfileNavigator} />
        </Tab.Navigator>
    );
};

export default MainTabNavigator;
