import React from 'react';
const RN = require('react-native');

// Polyfill StyleSheet.flatten antes de qualquer outra coisa conforme padrão do projeto
if (typeof RN.StyleSheet.flatten !== 'function') {
  RN.StyleSheet.flatten = (s: any) => (Array.isArray(s) ? Object.assign({}, ...s) : s);
}

import { render, waitFor } from '@testing-library/react-native';
import PublicProfileScreen from '../PublicProfileScreen';
import { getPublicProfile } from '@/services/profileService';

// Mock react-native-paper para evitar erros de renderização
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text: RNText } = require('react-native');
  return {
    Text: ({ children, style }: any) => <RNText style={style}>{children}</RNText>,
    Divider: () => <View />,
    Button: ({ children, onPress }: any) => (
      <View onTouchEnd={onPress}>{children}</View>
    ),
  };
});

// Mocks simples de componentes para isolar o teste do PublicProfileScreen
jest.mock('@/components/profile/ProfileHeader', () => {
  const { View } = require('react-native');
  return (props: any) => <View testID="profile-header" {...props} />;
});

jest.mock('@/components/profile/TrustFooter', () => {
  const { View } = require('react-native');
  return {
    TrustFooter: (props: any) => <View testID="trust-footer" {...props} />
  };
});

jest.mock('@/services/profileService', () => ({
  getPublicProfile: jest.fn(),
}));

// Mock da navegação e parâmetros da rota
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
} as any;

const mockPrestador = {
  id: 'user-1',
  nome: 'João das Neves',
  avatar: 'https://avatar.com/1',
  localizacao: { cidade: 'São Paulo', estado: 'SP' },
  telefone: '11999999999',
  avaliacao: 4.8,
  tipoPessoa: 'PF' as const,
  verified: true,
};

const mockRoute = {
  params: {
    userId: 'user-1',
    prestador: mockPrestador,
  },
} as any;

describe('PublicProfileScreen - Disponibilidade de Telefone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve passar o telefone inicial dos parâmetros da rota para o ProfileHeader e TrustFooter', () => {
    (getPublicProfile as jest.Mock).mockReturnValue(new Promise(() => {})); // Mantém em loading/background

    const { getByTestId } = render(
      <PublicProfileScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Verifica se o ProfileHeader recebeu o objeto user com o telefone correto
    const profileHeader = getByTestId('profile-header');
    expect(profileHeader.props.user.telefone).toBe(mockPrestador.telefone);

    // Verifica se o TrustFooter recebeu o objeto user com o telefone correto
    const trustFooter = getByTestId('trust-footer');
    expect(trustFooter.props.user.telefone).toBe(mockPrestador.telefone);
  });

  it('deve atualizar o telefone nos componentes quando os dados enriquecidos da API retornarem', async () => {
    const updatedProfile = {
      ...mockPrestador,
      telefone: '21888888888',
    };
    (getPublicProfile as jest.Mock).mockResolvedValue(updatedProfile);

    const { getByTestId } = render(
      <PublicProfileScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Aguarda a atualização do estado após a chamada da API
    await waitFor(() => {
      const profileHeader = getByTestId('profile-header');
      expect(profileHeader.props.user.telefone).toBe('21888888888');
    });

    const trustFooter = getByTestId('trust-footer');
    expect(trustFooter.props.user.telefone).toBe('21888888888');
  });

  it('deve manter o telefone original caso a API de enriquecimento falhe', async () => {
    (getPublicProfile as jest.Mock).mockRejectedValue(new Error('Erro de API'));

    const { getByTestId } = render(
      <PublicProfileScreen route={mockRoute} navigation={mockNavigation} />
    );

    // Aguarda a tentativa da API
    await waitFor(() => {
      expect(getPublicProfile).toHaveBeenCalledWith('user-1');
    });

    // O telefone deve permanecer o original vindo dos params
    const profileHeader = getByTestId('profile-header');
    expect(profileHeader.props.user.telefone).toBe(mockPrestador.telefone);
    
    const trustFooter = getByTestId('trust-footer');
    expect(trustFooter.props.user.telefone).toBe(mockPrestador.telefone);
  });
});
