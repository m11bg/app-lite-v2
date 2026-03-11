import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileHeaderSkeleton from '@/components/profile/skeletons/ProfileHeaderSkeleton';
import { TrustFooter } from '@/components/profile/TrustFooter';
import { getPublicProfile } from '@/services/profileService';
import type { PrestadorResumo } from '@/types/profilePreview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OfertasStackParamList } from '@/types';

type Props = NativeStackScreenProps<OfertasStackParamList, 'PublicProfile'>;

/**
 * Tela de perfil público de outro usuário.
 * Acessada a partir do stack de Ofertas quando o usuário clica em
 * "Ver Perfil Completo" no modal de preview do prestador.
 *
 * Esta tela busca os dados públicos do usuário pela API e exibe
 * o cabeçalho com informações públicas, sem expor dados sensíveis.
 *
 * @component
 * @param {Props} props - Props de navegação contendo o userId nos params.
 * @returns {JSX.Element} Tela de perfil público renderizada.
 */
const PublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
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
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={{ marginTop: spacing.md }}
        >
          Voltar
        </Button>
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

export default PublicProfileScreen;
