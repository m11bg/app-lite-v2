import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ProfileHeader from '../ProfileHeader';
import AnalyticsService from '@/services/AnalyticsService';
import { navigationRef } from '@/navigation/RootNavigation';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock do React Native seguindo o padrão do projeto
jest.mock('react-native', () => {
  const React = require('react');
  const View = (props: any) => React.createElement('view', props, props.children);
  const Text = (props: any) => React.createElement('text', props, props.children);
  const TouchableOpacity = (props: any) => React.createElement('pressable', props, props.children);
  const StyleSheet = {
    create: (s: any) => s,
    flatten: (s: any) => {
      if (Array.isArray(s)) {
        return Object.assign({}, ...s.map((i: any) => (typeof i === 'object' ? i : {})));
      }
      return s || {};
    },
  };
  return {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Appearance: { getColorScheme: () => 'light' },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default },
  };
});

// Mock dos ícones e outros componentes
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'Icon',
}));

jest.mock('@/services/AnalyticsService', () => ({
  track: jest.fn(),
}));

jest.mock('@/navigation/RootNavigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('@/components/common/OptimizedImage', () => 'OptimizedImage');

jest.mock('../ProfileMoreMenu', () => {
    const React = require('react');
    const { View } = require('react-native');
    // Repassa as props para que possamos interagir com elas nos testes
    return (props: any) => React.createElement(View, { testID: 'ProfileMoreMenu', ...props }, props.anchor);
});

// Mock do react-native-paper componentes
jest.mock('react-native-paper', () => {
  const React = require('react');
  const View = (props: any) => React.createElement('view', props, props.children);
  const Text = (props: any) => React.createElement('text', props, props.children);
  const Button = (props: any) => React.createElement('button', props, props.children);
  const IconButton = (props: any) => React.createElement('icon-button', props, props.children);
  const AvatarText = (props: any) => React.createElement('avatar-text', props, props.label);

  return {
    Text,
    Button,
    IconButton,
    Avatar: {
      Text: AvatarText,
    },
  };
});

const mockUser = {
  id: 'user-123',
  nome: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  avatarBlurhash: 'L6PZfSi_.AyE_3t7t7R**j_3mWj?',
  verified: true,
  avaliacao: 4.5,
  telefone: '(11) 98765-4321',
  localizacao: {
    cidade: 'São Paulo',
    estado: 'SP',
  },
};

describe('ProfileHeader', () => {
  const findText = (tree: any, text: string) => {
    return tree.root.findAllByType('text').some((t: any) => {
      const children = t.props.children;
      const content = Array.isArray(children) ? children.join('') : String(children);
      return content.includes(text);
    });
  };

  const findByTestID = (tree: any, testID: string) => {
    try {
        return tree.root.find((el: any) => el.props.testID === testID);
    } catch {
        return null;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve renderizar o nome e handle corretamente', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    expect(findText(tree, 'John Doe')).toBe(true);
    expect(findText(tree, '@johndoe')).toBe(true);
  });

  it('deve exibir o selo de verificado quando user.verified é true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const views = tree.root.findAllByType('view');
    const badge = views.find((v: any) => v.props.accessibilityLabel === 'Perfil verificado');
    expect(badge).toBeTruthy();
  });

  it('não deve exibir o selo de verificado quando user.verified é false', () => {
    const unverifiedUser = { ...mockUser, verified: false };
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={unverifiedUser} profileId={unverifiedUser.id} />);
    });

    const views = tree.root.findAllByType('view');
    const badge = views.find((v: any) => v.props.accessibilityLabel === 'Perfil verificado');
    expect(badge).toBeFalsy();
  });

  it('deve renderizar OptimizedImage quando houver avatarUrl e sem erro', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const optimizedImage = tree.root.findByType('OptimizedImage');
    expect(optimizedImage).toBeTruthy();
    expect(optimizedImage.props.source.uri).toBe(mockUser.avatar);
  });

  it('deve renderizar Avatar.Text quando não houver avatarUrl', () => {
    const userNoAvatar = { ...mockUser, avatar: undefined };
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={userNoAvatar} profileId={userNoAvatar.id} />);
    });

    const avatarText = tree.root.findByType('avatar-text');
    expect(avatarText).toBeTruthy();
    expect(avatarText.props.children).toBe('J'); // 'John Doe' -> 'J'
  });

  it('deve exibir informações de contato quando isPreview é true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={true} />);
    });

    expect(findText(tree, '(11) 98765-4321')).toBe(true);
    expect(findText(tree, 'São Paulo - SP')).toBe(true);
    
    // Não deve ter botão "Editar Perfil"
    const buttons = tree.root.findAllByType('button');
    const editBtn = buttons.find((b: any) => {
        const text = findTextInComponent(b);
        return text.includes('Editar Perfil');
    });
    expect(editBtn).toBeFalsy();
  });

  it('deve exibir o botão de editar perfil quando isPreview é false', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={false} />);
    });

    const buttons = tree.root.findAllByType('button');
    const editBtn = buttons.find((b: any) => {
        const text = findTextInComponent(b);
        return text.includes('Editar Perfil');
    });
    expect(editBtn).toBeTruthy();
    expect(findText(tree, '(11) 98765-4321')).toBe(false);
  });

  it('deve trackear evento e navegar ao clicar em Editar Perfil', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} isPreview={false} />);
    });

    const buttons = tree.root.findAllByType('button');
    const editBtn = buttons.find((b: any) => findTextInComponent(b).includes('Editar Perfil'));
    
    act(() => {
      editBtn.props.onPress();
    });

    expect(AnalyticsService.track).toHaveBeenCalledWith('profile_edit_click');
    expect(navigationRef.navigate).toHaveBeenCalledWith('Perfil', { screen: 'EditProfile' });
  });

  it('deve trackear evento e abrir menu ao clicar no botão de menu', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const menuBtn = findByTestID(tree, 'profile-menu-button');
    expect(menuBtn).toBeTruthy();
    act(() => {
      menuBtn.props.onPress();
    });

    expect(AnalyticsService.track).toHaveBeenCalledWith('profile_more_options_click');
  });

  it('deve lidar com usuário nulo (loading state ou erro)', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={null} profileId="123" />);
    });

    expect(findText(tree, 'Usuário')).toBe(true);
    expect(findText(tree, '@usuario')).toBe(true);
    expect(findText(tree, '0.0')).toBe(true); // Avaliação padrão
  });

  it('deve renderizar Avatar.Text quando houver erro no carregamento da imagem', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const optimizedImage = tree.root.findByType('OptimizedImage');
    act(() => {
      optimizedImage.props.onError();
    });

    // Após o erro, OptimizedImage deve desaparecer e Avatar.Text deve aparecer
    const avatarText = tree.root.findByType('avatar-text');
    expect(avatarText).toBeTruthy();
    expect(avatarText.props.children).toBe('J');
  });

  it('deve atualizar o estado de visibilidade do menu via onDismiss', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const menu = tree.root.findByProps({ testID: 'ProfileMoreMenu' });
    
    // Simular abertura do menu para garantir que setMenuVisible(true) aconteceu
    const menuBtn = findByTestID(tree, 'profile-menu-button');
    act(() => {
      menuBtn.props.onPress();
    });
    expect(menu.props.visible).toBe(true);

    // Simular dismiss
    act(() => {
      menu.props.onDismiss();
    });

    // Verificar se o estado de visibilidade mudou
    expect(menu.props.visible).toBe(false);
  });

  it('deve navegar para configurações ao disparar onNavigateSettings do menu', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<ProfileHeader user={mockUser} profileId={mockUser.id} />);
    });

    const menu = tree.root.findByProps({ testID: 'ProfileMoreMenu' });
    act(() => {
      menu.props.onNavigateSettings();
    });

    expect(navigationRef.navigate).toHaveBeenCalledWith('Perfil', { screen: 'Settings' });
  });
});

// Helper function to extract all text from a component tree
function findTextInComponent(component: any): string {
  if (typeof component === 'string') return component;
  if (!component) return '';
  if (Array.isArray(component)) {
    return component.map(findTextInComponent).join('');
  }
  if (!component.props) return '';
  const children = component.props.children;
  return findTextInComponent(children);
}
