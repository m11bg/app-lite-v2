import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, useIsFocused } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/theme';
import GuestProfileView from './GuestProfileView';
import UserProfileView from './UserProfileView';
import PublicProfileView from './PublicProfileView';
import type { ProfileStackParamList } from '@/types';

/**
 * Componente principal da tela de Perfil.
 * Atua como um contêiner que decide qual visualização exibir:
 * 
 * 1. Se `userId` é passado via params E é diferente do usuário logado:
 *    → Exibe o perfil público do outro usuário (PublicProfileView).
 * 2. Se `userId` não é passado OU é igual ao do usuário logado:
 *    → Exibe o perfil do próprio usuário (UserProfileView).
 * 3. Se o usuário não está autenticado:
 *    → Exibe a visão de visitante (GuestProfileView).
 *
 * @component
 * @returns {JSX.Element} O componente renderizado da tela de Perfil.
 */
const ProfileHome: React.FC = () => {
  const route = useRoute<RouteProp<ProfileStackParamList, 'ProfileHome'>>();
  const { isAuthenticated, user } = useAuth();
  const isFocused = useIsFocused();

  // Extrai o userId dos parâmetros da rota (pode ser undefined)
  const targetUserId = route.params?.userId;

  // Determina se estamos visualizando o perfil de outro usuário
  const isOtherUser = Boolean(
    targetUserId && user?.id && targetUserId !== user.id
  );

  // Estado que indica se a tela está em processo de carregamento inicial
  const [isLoading, setIsLoading] = useState(true);

  // Estado auxiliar para controlar a exibição do skeleton.
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => setShowSkeleton(true), 200);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowSkeleton(false);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(delay);
    };
  }, []);

  return (
    <View style={styles.container}>
      {isOtherUser ? (
        // Perfil público de outro usuário
        <PublicProfileView userId={targetUserId!} />
      ) : isAuthenticated ? (
        // Perfil do próprio usuário logado
        <UserProfileView isLoading={isLoading} showSkeleton={showSkeleton} />
      ) : (
        // Visitante não autenticado
        <GuestProfileView />
      )}
    </View>
  );
};

/**
 * Estilos aplicados ao componente ProfileHome.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default ProfileHome;
