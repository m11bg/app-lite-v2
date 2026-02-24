import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import type { OfertaServico } from '@/types/oferta';
import * as expoVideo from 'expo-video';

// Patch/mocks devem ser aplicados antes de importar o componente
jest.mock('react-native/Libraries/Animated/Animated', () => {
    const startObj = { start: (cb?: any) => (typeof cb === 'function' ? cb() : undefined) };
    const AnimatedMock = {
        Value: function(this: any, initial: any){ this._val = initial; this.setValue = (v: any) => { this._val = v; }; },
        timing: () => startObj,
        sequence: () => startObj,
    };
    return {
        __esModule: true,
        default: AnimatedMock,
        ...AnimatedMock,
    };
});

const OfferSwipeCard = require('@/components/offers/OfferSwipeCard').default as typeof import('@/components/offers/OfferSwipeCard').default;

// Mock do indicador de progresso para facilitar asserções do índice atual
jest.mock('@/components/offers/MediaProgressIndicator', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return ({ count, currentIndex, progress }: any) => (
        React.createElement(Text, { testID: 'media-progress' }, `count:${count};currentIndex:${currentIndex};progress:${progress}`)
    );
});

// Mock da expo-image para expor um testID e permitir disparar onLoad
jest.mock('expo-image', () => {
    const React = require('react');
    const { View } = require('react-native');
    const Image = (props: any) => React.createElement(View, { ...props, testID: 'expo-image' });
    return { Image };
});

// Mock de useSwiperIndex para evitar erros de contexto
jest.mock('@/context/SwiperIndexContext', () => ({
    useSwiperIndex: jest.fn(() => 0),
}));

const makeOffer = (overrides?: Partial<OfertaServico>): OfertaServico => ({
    _id: '1',
    titulo: 'Serviço de Teste',
    descricao: 'Descrição',
    preco: 100,
    unidadePreco: 'hora' as any,
    categoria: 'Casa',
    prestador: { _id: 'p1', nome: 'João', avaliacao: 5 },
    imagens: [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
    ],
    videos: [],
    localizacao: { cidade: 'SP', estado: 'SP' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
});

describe('OfferSwipeCard - Auto-avanço de Mídia', () => {
    beforeAll(() => {
        // Patch básico para Animated no ambiente de teste
        const RN = require('react-native');
        if (!RN.Animated || typeof RN.Animated.Value !== 'function') {
            RN.Animated = {
                ...(RN.Animated || {}),
                Value: function(initial: any){ this._val = initial; this.setValue = (v: any) => { this._val = v; }; },
                timing: () => ({ start: (cb?: any) => cb && cb() }),
                sequence: () => ({ start: (cb?: any) => cb && cb() }),
            };
        }
    });

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('auto-avança imagem após 4s quando carregada e card ativo', () => {
        const item = makeOffer({ imagens: ['img1.jpg', 'img2.jpg'], videos: [] });
        const { getByTestId } = render(<OfferSwipeCard item={item} isActiveCard={true} accessibilityHint="" />);

        // Disparar onLoad da imagem atual
        fireEvent(getByTestId('expo-image'), 'load');

        // Índice inicial 0
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:0');

        // 3.9s ainda sem avanço
        act(() => { jest.advanceTimersByTime(3900); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:0');

        // Completa 4s
        act(() => { jest.advanceTimersByTime(200); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:1');
    });

    it('não auto-avança se a imagem não tiver carregado', () => {
        const item = makeOffer({ imagens: ['img1.jpg', 'img2.jpg'], videos: [] });
        const { getByTestId } = render(<OfferSwipeCard item={item} isActiveCard={true} accessibilityHint="" />);

        // Sem onLoad
        act(() => { jest.advanceTimersByTime(5000); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:0');
    });

    it('auto-avança quando vídeo atinge 98.5% de progresso', () => {
        const item = makeOffer({ imagens: [], videos: ['v1.mp4', 'v2.mp4'] });

        const mockPlayer = {
            addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
            play: jest.fn(),
            pause: jest.fn(),
            duration: 100,
            muted: true,
            loop: false,
        };
        (expoVideo.useVideoPlayer as jest.Mock).mockReturnValue(mockPlayer as any);

        const { getByTestId } = render(<OfferSwipeCard item={item} isActiveCard={true} accessibilityHint="" />);

        const timeUpdateCall = mockPlayer.addListener.mock.calls.find((c: any[]) => c[0] === 'timeUpdate');
        expect(timeUpdateCall).toBeDefined();
        const timeUpdateCb = timeUpdateCall[1];

        // 90% não avança
        act(() => { timeUpdateCb({ currentTime: 90 }); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:0');

        // 98.6% avança
        act(() => { timeUpdateCb({ currentTime: 98.6 }); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:1');
    });

    it('reseta timer ao mudar de mídia manualmente', () => {
        const item = makeOffer({ imagens: ['i1.jpg', 'i2.jpg', 'i3.jpg'], videos: [] });
        const { getByTestId } = render(<OfferSwipeCard item={item} isActiveCard={true} accessibilityHint="" />);

        // Carrega imagem 1
        fireEvent(getByTestId('expo-image'), 'load');
        act(() => { jest.advanceTimersByTime(2000); });

        // Avança manualmente tocando no lado direito
        const pressable = getByTestId('media-pressable');
        fireEvent(pressable, 'layout', { nativeEvent: { layout: { width: 300 } } });
        fireEvent(pressable, 'press', { nativeEvent: { locationX: 280 } });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:1');

        // Carrega imagem 2 e avança 2.1s — ainda não deve avançar
        fireEvent(getByTestId('expo-image'), 'load');
        act(() => { jest.advanceTimersByTime(2100); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:1');

        // Após mais ~2s deve avançar para índice 2
        act(() => { jest.advanceTimersByTime(2000); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:2');
    });

    it('para auto-avanço quando o card fica inativo', () => {
        const item = makeOffer({ imagens: ['i1.jpg', 'i2.jpg'], videos: [] });
        const { getByTestId, rerender } = render(<OfferSwipeCard item={item} isActiveCard={true} accessibilityHint="" />);

        fireEvent(getByTestId('expo-image'), 'load');
        act(() => { jest.advanceTimersByTime(3000); });

        // Fica inativo
        rerender(<OfferSwipeCard item={item} isActiveCard={false} accessibilityHint="" />);

        // Mesmo avançando o tempo, não deve avançar e índice reseta para 0
        act(() => { jest.advanceTimersByTime(2000); });
        expect(getByTestId('media-progress').props.children).toContain('currentIndex:0');
    });
});
