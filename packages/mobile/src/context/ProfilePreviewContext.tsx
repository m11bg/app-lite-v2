import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { Portal, Modal, Button } from 'react-native-paper';
import { navigationRef } from '@/navigation/RootNavigation';
import { PrestadorResumo } from '@/types/profilePreview';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { spacing, radius, colors } from '@/styles/theme';
import { RootStackParamList } from '@/types';

// Tipagem para o estado do contexto
interface ProfilePreviewState {
  isVisible: boolean;
  prestador: PrestadorResumo | null;
}

// Tipagem para as ações do contexto
interface ProfilePreviewActions {
  showProfile: (prestador: PrestadorResumo) => void;
  hideProfile: () => void;
  navigateToProfile: () => void;
}

const ProfilePreviewStateContext = createContext<ProfilePreviewState | undefined>(undefined);
const ProfilePreviewActionsContext = createContext<ProfilePreviewActions | undefined>(undefined);

export const ProfilePreviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProfilePreviewState>({
    isVisible: false,
    prestador: null,
  });

  const showProfile = useCallback((prestador: PrestadorResumo) => {
    setState({ isVisible: true, prestador });
  }, []);

  const hideProfile = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const navigateToProfile = useCallback(() => {
    const profileId = state.prestador?.id;
    if (!profileId) return;

    // Fecha o modal primeiro
    hideProfile();

    // Aguarda o término da animação do modal para navegar suavemente
    requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        // Navegação aninhada: navega para a aba Perfil > tela ProfileHome
        // passando o userId do prestador selecionado como parâmetro.
        // A tela ProfileHome usará esse userId para decidir se exibe
        // o perfil público (outro usuário) ou o perfil próprio.
        // @ts-ignore - Tipagem flexível para navegação global
        navigationRef.navigate('Main', {
          screen: 'Perfil',
          params: {
            screen: 'ProfileHome',
            params: { userId: profileId },
          },
        });
      }
    });
  }, [state.prestador?.id, hideProfile]);

  const stateValue = useMemo(() => state, [state]);
  const actionsValue = useMemo(() => ({
    showProfile,
    hideProfile,
    navigateToProfile,
  }), [showProfile, hideProfile, navigateToProfile]);

  return (
    <ProfilePreviewStateContext.Provider value={stateValue}>
      <ProfilePreviewActionsContext.Provider value={actionsValue}>
        {children}
        <Portal>
          <Modal
            visible={state.isVisible}
            onDismiss={hideProfile}
            contentContainerStyle={{
              backgroundColor: colors.surface,
              margin: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.lg,
            }}
          >
            {state.prestador && (
              <>
                <ProfileHeader user={state.prestador} profileId={state.prestador.id} isPreview={true} />
                <Button
                  mode="contained"
                  onPress={navigateToProfile}
                  style={{ marginTop: spacing.md }}
                >
                  Ver Perfil Completo
                </Button>
                <Button
                  mode="text"
                  onPress={hideProfile}
                  style={{ marginTop: spacing.xs }}
                >
                  Fechar
                </Button>
              </>
            )}
          </Modal>
        </Portal>
      </ProfilePreviewActionsContext.Provider>
    </ProfilePreviewStateContext.Provider>
  );
};

export const useProfilePreview = () => {
  const state = useContext(ProfilePreviewStateContext);
  const actions = useContext(ProfilePreviewActionsContext);

  if (state === undefined || actions === undefined) {
    throw new Error('useProfilePreview must be used within a ProfilePreviewProvider');
  }

  return { ...state, ...actions };
};

export const useProfilePreviewActions = () => {
  const context = useContext(ProfilePreviewActionsContext);
  if (context === undefined) {
    throw new Error('useProfilePreviewActions must be used within a ProfilePreviewProvider');
  }
  return context;
};

export const useProfilePreviewState = () => {
  const context = useContext(ProfilePreviewStateContext);
  if (context === undefined) {
    throw new Error('useProfilePreviewState must be used within a ProfilePreviewProvider');
  }
  return context;
};
