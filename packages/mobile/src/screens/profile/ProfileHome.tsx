import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/styles/theme';
import GuestProfileView from './GuestProfileView';
import UserProfileView from './UserProfileView';

/**
 * Componente principal da tela de Perfil (aba Perfil).
 *
 * Esta tela é exclusivamente para o perfil do próprio usuário logado.
 * A visualização de perfis de outros usuários é feita pela tela
 * PublicProfileScreen, que fica no stack de Ofertas.
 *
 * Decide qual visualização exibir:
 * 1. Se o usuário está autenticado → UserProfileView (perfil próprio).
 * 2. Se não está autenticado → GuestProfileView (visitante).
 *
 * @component
 * @returns {JSX.Element} O componente renderizado da tela de Perfil.
 */
const ProfileHome: React.FC = () => {
  const { isAuthenticated } = useAuth();

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
      {isAuthenticated ? (
        <UserProfileView isLoading={isLoading} showSkeleton={showSkeleton} />
      ) : (
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
