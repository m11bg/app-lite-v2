import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Divider, Button } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { TrustFooter } from '@/components/profile/TrustFooter';
import { getPublicProfile } from '@/services/profileService';
import { useChatActions } from '@/context/chat/ChatActionsContext';
import { useAuth } from '@/context/AuthContext';
import type { PrestadorResumo } from '@/types/profilePreview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OfertasStackParamList } from '@/types';
import { useNavigation } from '@react-navigation/native';

type Props = NativeStackScreenProps<OfertasStackParamList, 'PublicProfile'>;

/**
 * Tela de perfil público de outro usuário.
 * Acessada a partir do stack de Ofertas quando o usuário clica em
 * "Ver Perfil Completo" no modal de preview do prestador.
 *
 * Estratégia de dados:
 * 1. Exibe imediatamente os dados do prestador recebidos via params (vindos da oferta).
 * 2. Em background, tenta buscar dados atualizados da API (enriquecimento opcional).
 * 3. Se a API falhar, mantém os dados locais — o usuário nunca vê erro.
 *
 * @component
 * @param {Props} props - Props de navegação contendo userId e prestador nos params.
 * @returns {JSX.Element} Tela de perfil público renderizada.
 */
const PublicProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, prestador: prestadorFromParams } = route.params;

  // Usa os dados do prestador recebidos via params como estado inicial (exibição imediata)
  const [profile, setProfile] = useState<PrestadorResumo>(prestadorFromParams);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const { createConversation } = useChatActions();
  const { isAuthenticated } = useAuth();
  const rootNavigation = useNavigation<any>();

  // Tenta enriquecer os dados com a API em background (opcional, não bloqueia UI)
  useEffect(() => {
    let cancelled = false;

    const enrichProfile = async () => {
      try {
        const freshData = await getPublicProfile(userId);
        if (!cancelled && freshData) {
          setProfile(freshData);
        }
      } catch {
        // Falha silenciosa: mantém os dados locais do prestador.
        // O endpoint pode não estar disponível na VPS ainda.
      }
    };

    void enrichProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Inicia conversa e navega para a tab Chat via cross-tab navigation.
   * Cria ou recupera conversa existente (idempotente) e redireciona.
   */
  const handleStartChat = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsChatLoading(true);
      const conversationId = await createConversation(userId);

      // Navegação cross-tab: Ofertas → Chat → ConversationDetail
      rootNavigation.navigate('Chat', {
        screen: 'ConversationDetail',
        params: {
          conversationId,
          participant: {
            _id: profile.id,
            nome: profile.nome,
            avatar: profile.avatar,
          },
        },
      });
    } catch {
      // Erro silencioso — futuramente mostrar Toast
    } finally {
      setIsChatLoading(false);
    }
  }, [isAuthenticated, createConversation, userId, rootNavigation, profile]);

  const userForFooter = useMemo(() => ({
    id: profile.id,
    nome: profile.nome,
    avatar: profile.avatar,
    localizacao: profile.localizacao,
    telefone: profile.telefone,
    tipoPessoa: profile.tipoPessoa,
    createdAt: undefined,
  }), [profile]);

  // Se por algum motivo não temos dados do prestador (caso extremo),
  // exibe mensagem de fallback com botão de voltar.
  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
          Perfil não encontrado.
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
        onStartChat={isAuthenticated ? handleStartChat : undefined}
        isChatLoading={isChatLoading}
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
