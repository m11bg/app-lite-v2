
// Ensure react-native StyleSheet.flatten exists before any imports use it
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    const flatten = (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s);
    return { ...RN, StyleSheet: { ...RN.StyleSheet, flatten } };
});

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SwipeOfertasScreen from '../SwipeOfertasScreen';
import { ofertaService } from '@/services/ofertaService';
import { interactionService } from '@/services/interactionService';
import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Mocks de serviços e contexto
jest.mock('@/services/ofertaService');
jest.mock('@/services/interactionService');
jest.mock('@/context/AuthContext');
jest.mock('@react-navigation/native');
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'Icon');


// Mock de subcomponentes para isolar o SwipeOfertasScreen
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
        IconButton: ({ icon, onPress, accessibilityLabel, ...props }: any) => (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} {...props}>
                <Text>{icon}</Text>
            </TouchableOpacity>
        ),
        Snackbar: ({ children, visible, action, onDismiss, ...props }: any) => visible ? (
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
        <View>
            <Text>{item?.titulo}</Text>
        </View>
    );
});
jest.mock('@/components/offers/SwipeLikeOverlay', () => 'SwipeLikeOverlay');
jest.mock('@/components/offers/SwipeNopeOverlay', () => 'SwipeNopeOverlay');

// Mock do Swiper
const mockSwipeLeft = jest.fn();
const mockSwipeRight = jest.fn();
const mockSwipeBack = jest.fn();

jest.mock('rn-swiper-list', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        Swiper: React.forwardRef(({ data, renderCard, onSwipeRight, onSwipeLeft, onSwipedAll }: any, ref: any) => {
            React.useImperativeHandle(ref, () => ({
                swipeLeft: mockSwipeLeft,
                swipeRight: mockSwipeRight,
                swipeBack: mockSwipeBack,
            }));

            return (
                <View testID="mock-swiper" 
                      // @ts-ignore
                      data-props={{ onSwipeRight, onSwipeLeft, onSwipedAll }}>
                    {data.map((item: any, index: number) => (
                        <View key={item._id || index} testID={`swiper-card-${index}`}>
                            {renderCard(item)}
                        </View>
                    ))}
                </View>
            );
        }),
    };
});

const mockOfertas = [
    { _id: '1', titulo: 'Oferta 1', preco: 10, empresa: { nome: 'Empresa 1' } },
    { _id: '2', titulo: 'Oferta 2', preco: 20, empresa: { nome: 'Empresa 2' } },
];

describe('SwipeOfertasScreen', () => {
    const mockNavigate = jest.fn();
    const mockSetOptions = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useNavigation as jest.Mock).mockReturnValue({
            navigate: mockNavigate,
            setOptions: mockSetOptions,
        });
        (useAuth as jest.Mock).mockReturnValue({
            isAuthenticated: true,
        });
        (ofertaService.getOfertas as jest.Mock).mockResolvedValue({
            ofertas: mockOfertas,
            totalPages: 2,
            page: 1,
            total: 20,
        });
    });

    it('deve renderizar o estado de carregamento inicial', async () => {
        let resolvePromise: any;
        const promise = new Promise((resolve) => {
            resolvePromise = resolve;
        });
        (ofertaService.getOfertas as jest.Mock).mockReturnValue(promise);

        const { queryByText, debug } = render(<SwipeOfertasScreen />);
        debug();
        expect(queryByText('Carregando ofertas...')).not.toBeNull();
        
        await act(async () => {
            resolvePromise({
                ofertas: mockOfertas,
                totalPages: 2,
                page: 1,
                total: 20,
            });
        });
    });

    it('deve renderizar as ofertas após o carregamento', async () => {
        const { getByText, queryByText } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(queryByText('Carregando ofertas...')).toBeNull();
        });

        expect(getByText('Oferta 1')).toBeTruthy();
        expect(getByText('Oferta 2')).toBeTruthy();
    });

    it('deve mostrar estado vazio quando não houver ofertas', async () => {
        (ofertaService.getOfertas as jest.Mock).mockResolvedValue({
            ofertas: [],
            totalPages: 1,
            page: 1,
            total: 0,
        });

        const { getByText, getByLabelText } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(getByText('Sem mais ofertas')).toBeTruthy();
        });

        const refreshButton = getByLabelText('Atualizar ofertas');
        fireEvent.press(refreshButton);

        expect(ofertaService.getOfertas).toHaveBeenCalledTimes(2);
    });

    it('deve navegar para BuscarOfertas ao clicar no botão do cabeçalho', async () => {
        render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        const HeaderRight = mockSetOptions.mock.calls[0][0].headerRight;
        const { getByLabelText } = render(<HeaderRight />);
        
        fireEvent.press(getByLabelText('Mudar para lista'));
        expect(mockNavigate).toHaveBeenCalledWith('BuscarOfertas');
    });

    it('deve chamar interactionService.likeOffer ao fazer swipe para a direita', async () => {
        const { getByTestId } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(ofertaService.getOfertas).toHaveBeenCalled();
        });

        const swiper = getByTestId('mock-swiper');
        const { onSwipeRight } = swiper.props['data-props'];

        await act(async () => {
            onSwipeRight(0);
        });

        expect(interactionService.likeOffer).toHaveBeenCalledWith('1');
    });

    it('deve chamar interactionService.dislikeOffer ao fazer swipe para a esquerda', async () => {
        const { getByTestId } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(ofertaService.getOfertas).toHaveBeenCalled();
        });

        const swiper = getByTestId('mock-swiper');
        const { onSwipeLeft } = swiper.props['data-props'];

        await act(async () => {
            onSwipeLeft(1);
        });

        expect(interactionService.dislikeOffer).toHaveBeenCalledWith('2');
    });

    it('deve chamar swipeBack ao clicar no botão desfazer', async () => {
        const { getByLabelText } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(ofertaService.getOfertas).toHaveBeenCalled();
        });

        fireEvent.press(getByLabelText('Desfazer último swipe'));
        expect(mockSwipeBack).toHaveBeenCalled();
    });

    it('deve carregar a próxima página ao atingir o threshold', async () => {
        // Criar mais ofertas para testar o threshold (PAGINATION_THRESHOLD = 3)
        // Se temos 10 ofertas, e fazemos swipe no index 7 (10 - 3 = 7), deve triggar.
        const manyOfertas = Array.from({ length: 10 }, (_, i) => ({
            _id: `${i}`, titulo: `Oferta ${i}`, preco: i, empresa: { nome: 'Empresa' }
        }));
        (ofertaService.getOfertas as jest.Mock).mockResolvedValue({
            ofertas: manyOfertas,
            totalPages: 2,
            page: 1,
            total: 20,
        });

        const { getByTestId } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(ofertaService.getOfertas).toHaveBeenCalled();
        });

        const swiper = getByTestId('mock-swiper');
        const { onSwipeRight } = swiper.props['data-props'];

        await act(async () => {
            onSwipeRight(7); // index >= 10 - 3
        });

        // Aguardar o debounce de 300ms
        await waitFor(() => {
            expect(ofertaService.getOfertas).toHaveBeenCalledWith({}, 2, 10, expect.any(AbortSignal));
        }, { timeout: 1000 });
    });

    it('deve mostrar erro no Snackbar e permitir retry', async () => {
        (ofertaService.getOfertas as jest.Mock).mockRejectedValueOnce(new Error('Erro de conexão'));

        const { getByText, queryByText } = render(<SwipeOfertasScreen />);

        await waitFor(() => {
            expect(getByText('Erro ao carregar ofertas: Erro de conexão')).toBeTruthy();
        });

        const retryButton = getByText('Tentar novamente');
        
        (ofertaService.getOfertas as jest.Mock).mockResolvedValue({
            ofertas: mockOfertas,
            totalPages: 1,
            page: 1,
            total: 2,
        });

        fireEvent.press(retryButton);

        await waitFor(() => {
            expect(queryByText('Erro ao carregar ofertas: Erro de conexão')).toBeNull();
            expect(getByText('Oferta 1')).toBeTruthy();
        });
    });
});
