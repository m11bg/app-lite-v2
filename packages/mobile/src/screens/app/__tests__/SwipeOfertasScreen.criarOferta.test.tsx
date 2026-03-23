/**
 * Testes para a funcionalidade de criação de oferta (botão "Criar oferta")
 * no header da tela SwipeOfertasScreen.
 *
 * Cenários a serem cobertos:
 *  - Usuário autenticado: deve navegar diretamente para 'CreateOferta'.
 *  - Usuário não autenticado: deve definir pendingRedirect e abrir o modal de autenticação.
 *  - O botão "Criar oferta" deve estar presente no header com o ícone e label corretos.
 *  - O headerRight deve conter ambos os botões (criar oferta e buscar ofertas).
 */

import React from 'react';
import * as RN from 'react-native';

// Polyfill StyleSheet.flatten early
if (RN.StyleSheet && typeof RN.StyleSheet.flatten !== 'function') {
    (RN.StyleSheet as any).flatten = (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s);
}

import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SwipeOfertasScreen from '../SwipeOfertasScreen';
import { ofertaService } from '@/services/ofertaService';
import { interactionService } from '@/services/interactionService';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { openAuthModal } from '@/navigation/RootNavigation';
import { OFFER_TRANSLATIONS } from '@/constants/translations';

// ────────────────────────────────────────────────────────
//  Mocks de serviços, contexto e navegação
// ────────────────────────────────────────────────────────
jest.mock('@/services/ofertaService');
jest.mock('@/services/interactionService');
jest.mock('@/context/AuthContext');
jest.mock('@react-navigation/native');
jest.mock('@/navigation/RootNavigation', () => ({ openAuthModal: jest.fn() }));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@/utils/haptics', () => ({ vibrateLight: jest.fn() }));

// ────────────────────────────────────────────────────────
//  Mocks de subcomponentes (isolamento do SwipeOfertasScreen)
// ────────────────────────────────────────────────────────
jest.mock('react-native-paper', () => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return {
        Text: ({ children, style, ...props }: any) => <Text style={style} {...props}>{children}</Text>,
        Button: ({ children, onPress, loading, ...props }: any) => (
            <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={loading} {...props}>
                <Text>{children}</Text>
            </TouchableOpacity>
        ),
        IconButton: ({ icon, onPress, onPressIn, accessibilityLabel, ...props }: any) => (
            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPress={onPress}
                onPressIn={onPressIn}
                {...props}
            >
                <Text>{icon}</Text>
            </TouchableOpacity>
        ),
        Snackbar: ({ children, visible, action, onDismiss, ...props }: any) =>
            visible ? (
                <View {...props}>
                    <Text>{children}</Text>
                    {action ? (
                        <TouchableOpacity accessibilityRole="button" onPress={action.onPress}>
                            <Text>{action.label}</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null,
        ActivityIndicator: (props: any) => <View {...props} />,
    };
});

jest.mock('@/components/offers/OfferSwipeCard', () => {
    const React = require('react');
    const { Text, View } = require('react-native');
    return ({ item }: any) => (
        <View testID="offer-swipe-card">
            <Text>{item?.titulo}</Text>
        </View>
    );
});

jest.mock('@/components/offers/OfferSwipeCardSkeleton', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => <View testID="offer-swipe-card-skeleton" />;
});

jest.mock('@/components/offers/SwipeLikeOverlay', () => 'SwipeLikeOverlay');
jest.mock('@/components/offers/SwipeNopeOverlay', () => 'SwipeNopeOverlay');
jest.mock('@/components/offers/SwipeSkipOverlay', () => 'SwipeSkipOverlay');

jest.mock('@/context/ProfilePreviewContext', () => ({
    ProfilePreviewProvider: ({ children }: any) => children,
    useProfilePreview: () => ({}),
}));

// Mock do Swiper
jest.mock('rn-swiper-list', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        Swiper: React.forwardRef(({ data, renderCard }: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                swipeLeft: jest.fn(),
                swipeRight: jest.fn(),
                swipeBack: jest.fn(),
                swipeTop: jest.fn(),
            }));
            return (
                <View testID="mock-swiper">
                    {data.map((item: any, index: number) => (
                        <View key={item._id || index}>{renderCard(item, index)}</View>
                    ))}
                </View>
            );
        }),
    };
});

// ────────────────────────────────────────────────────────
//  Dados de teste
// ────────────────────────────────────────────────────────
const mockOfertas = [
    { _id: '1', titulo: 'Oferta 1', preco: 10, empresa: { nome: 'Empresa 1' } },
    { _id: '2', titulo: 'Oferta 2', preco: 20, empresa: { nome: 'Empresa 2' } },
];

// ────────────────────────────────────────────────────────
//  Suíte de testes
// ────────────────────────────────────────────────────────
describe('SwipeOfertasScreen – Botão Criar Oferta no Header', () => {
    const mockNavigate = jest.fn();
    const mockSetOptions = jest.fn();
    const mockSetPendingRedirect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        (useNavigation as jest.Mock).mockReturnValue({
            navigate: mockNavigate,
            setOptions: mockSetOptions,
        });

        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: true,
            setPendingRedirect: mockSetPendingRedirect,
        });

        (ofertaService.getOfertas as jest.Mock).mockResolvedValue({
            ofertas: mockOfertas,
            totalPages: 1,
            page: 1,
            total: 2,
        });
    });

    /**
     * Helper: renderiza o componente headerRight que foi passado ao navigation.setOptions.
     * Aguarda o setOptions ser chamado e então renderiza o headerRight extraído.
     */
    async function renderHeaderRight() {
        render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        const HeaderRight = mockSetOptions.mock.calls[0][0].headerRight;
        return render(<HeaderRight />);
    }

    // TODO: Adicionar testes aqui
    // Exemplos de cenários:
    //
    // it('deve navegar para CreateOferta ao pressionar o botão quando autenticado')
    // it('deve abrir modal de autenticação e definir pendingRedirect quando não autenticado')
    // it('deve renderizar o botão com accessibilityLabel "Criar oferta"')
    // it('deve renderizar ambos os botões no headerRight (criar oferta e buscar ofertas)')
});

