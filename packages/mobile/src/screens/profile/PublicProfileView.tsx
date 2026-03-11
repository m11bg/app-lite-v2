import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { ActivityIndicator, Text, Divider } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileHeaderSkeleton from '@/components/profile/skeletons/ProfileHeaderSkeleton';
import { TrustFooter } from '@/components/profile/TrustFooter';
import { getPublicProfile } from '@/services/profileService';
import type { PrestadorResumo } from '@/types/profilePreview';

/**
 * Interface que define as propriedades aceitas pelo componente PublicProfileView.
 *
 * @interface Props
 * @property {string} userId - ID do usuário cujo perfil público será exibido.
 */
interface Props {
  userId: string;
}

/**
 * Componente que renderiza a visualização pública do perfil de outro usuário.
 * Busca os dados do usuário pela API e exibe o cabeçalho com informações públicas.
 *
 * @component
 * @param {Props} props - As propriedades do componente.
 * @returns {JSX.Element} O elemento JSX que representa a tela de perfil público.
 */
const PublicProfileView: React.FC<Props> = ({ userId }) => {
  const [profile, setProfile] = useState<PrestadorResumo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPublicProfile(userId);
        if (!cancelled) {
          setProfile(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as Error)?.message ?? 'Erro ao carregar perfil.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Monta um objeto User parcial para o TrustFooter a partir do PrestadorResumo
  const userForFooter = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      nome: profile.nome,
      avatar: profile.avatar,
      localizacao: profile.localizacao,
      telefone: profile.telefone,
      tipoPessoa: profile.tipoPessoa,
      createdAt: undefined,
    };
  }, [profile]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ProfileHeaderSkeleton />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
          {error ?? 'Perfil não encontrado.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProfileHeader
        user={profile}
        profileId={profile.id}
        isPreview={false}
        isPublicView={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Divider style={{ marginVertical: spacing.lg }} />
        <TrustFooter user={userForFooter as any} />
        <Divider style={{ marginVertical: spacing.lg }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});

export default PublicProfileView;
