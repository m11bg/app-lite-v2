import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { Portal, Modal, Button, ActivityIndicator } from 'react-native-paper';
import { navigationRef } from '@/navigation/RootNavigation';
import { PrestadorResumo } from '@/types/profilePreview';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { spacing, radius, colors } from '@/styles/theme';
import { getPublicProfile } from '@/services/profileService';
import { View } from 'react-native';

// Tipagem para o estado do contexto
interface ProfilePreviewState {
  isVisible: boolean;
  prestador: PrestadorResumo | null;
  isLoading: boolean;
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
    isLoading: false,
  });

  const showProfile = useCallback((prestador: PrestadorResumo) => {
    setState({ isVisible: true, prestador, isLoading: false });
  }, []);

  const hideProfile = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: false, isLoading: false }));
  }, []);

  /**
   * Efeito para buscar dados atualizados do prestador quando o modal é aberto.
   * Isso resolve o problema de dados desatualizados (como telefone ausente)
   * que podem vir do snapshot da oferta.
   */
  useEffect(() => {
    let cancelled = false;

    if (state.isVisible && state.prestador?.id) {
      const enrichProfile = async () => {
        // Só marcamos como carregando se realmente faltarem dados críticos (ex: telefone)
        // para evitar flickering desnecessário se já tivermos tudo.
        const needsEnrichment = !state.prestador?.telefone;
        
        if (needsEnrichment) {
          setState(prev => ({ ...prev, isLoading: true }));
        }

        try {
          const freshData = await getPublicProfile(state.prestador!.id);
          if (!cancelled && freshData) {
            setState(prev => ({ 
              ...prev, 
              prestador: freshData, 
              isLoading: false 
            }));
          }
        } catch (error) {
          console.error('[ProfilePreviewContext] Falha ao enriquecer perfil:', error);
          if (!cancelled) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        }
      };

      void enrichProfile();
    }

    return () => {
      cancelled = true;
    };
  }, [state.isVisible, state.prestador?.id]);

  const navigateToProfile = useCallback(() => {
    const prestador = state.prestador;
    if (!prestador?.id) return;

    // Fecha o modal primeiro
    hideProfile();

    // Aguarda o término da animação do modal para navegar suavemente
    requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        // Navega para a tela PublicProfile DENTRO do stack de Ofertas,
        // passando os dados completos do prestador que já temos no contexto.
        // Isso garante exibição imediata sem depender de chamada à API.
        // @ts-ignore - Tipagem flexível para navegação global
        navigationRef.navigate('Main', {
          screen: 'Ofertas',
          params: {
            screen: 'PublicProfile',
            params: {
              userId: prestador.id,
              prestador,
            },
          },
        });
      }
    });
  }, [state.prestador, hideProfile]);

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
              minHeight: 200, // Garante espaço para o loader
            }}
          >
            {state.isLoading ? (
              <View style={{ padding: spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : state.prestador && (
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
