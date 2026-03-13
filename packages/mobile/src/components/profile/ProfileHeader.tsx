import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Avatar, Button, IconButton } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';
import { THEME_CONFIG } from '@/constants/config';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Kpi from './Kpi';
import AnalyticsService from '@/services/AnalyticsService';
import ProfileMoreMenu from './ProfileMoreMenu';
import { navigationRef } from '@/navigation/RootNavigation';
import { PrestadorResumo } from '@/types/profilePreview';

import OptimizedImage from '@/components/common/OptimizedImage';

import { formatPhoneNumber } from '@/utils/phoneFormatter';

/**
 * Definição das propriedades para o componente ProfileHeader.
 */
interface ProfileHeaderProps {
  /** Objeto contendo os dados do usuário a serem exibidos. Pode ser nulo durante o carregamento. */
  user: PrestadorResumo | null;
  /** Identificador único do perfil utilizado para gerar URLs e rastreamento. */
  profileId: string;
  /** Se o componente deve exibir o modo de pré-visualização (contato) ou perfil completo (botão editar) */
  isPreview?: boolean;
  /** Se true, indica que estamos visualizando o perfil público de outro usuário (sem botão editar) */
  isPublicView?: boolean;
}

/**
 * Componente que exibe o cabeçalho principal do perfil do usuário.
 * 
 * Apresenta a foto de perfil (avatar) com badge de verificação, nome, handle social,
 * métricas principais (KPIs) e ações rápidas como edição e compartilhamento.
 * 
 * @component
 * @param {ProfileHeaderProps} props - Propriedades do componente.
 * @returns {JSX.Element} Cabeçalho estilizado do perfil.
 */
const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, profileId, isPreview = false, isPublicView = false }) => {
  /** Hook de navegação do React Navigation via referência global */
  const navigation = navigationRef;
  
  /** Estado que controla a exibição do menu de opções extras */
  const [menuVisible, setMenuVisible] = useState(false);
  
  /** URL pública do perfil, calculada apenas quando o ID do perfil muda */
  const profileUrl = useMemo(() => `https://seuapp.com/profile/${profileId}`, [profileId]);
  
  /** Inicial do nome para o avatar em fallback */
  const initial = (user?.nome?.[0] ?? 'U').toUpperCase();
  
  /** Nome formatado para exibição */
  const displayName = user?.nome ?? 'Usuário';
  
  /** Identificador social (@usuario) gerado a partir do nome */
  const handle = `@${user?.nome ? user.nome.toLowerCase().replace(/\s/g, '') : 'usuario'}`;
  
  /** URL da imagem do avatar */
  const avatarUrl = user?.avatar;
  
  /** Hash para o efeito de borrão (blur) enquanto a imagem principal carrega */
  const avatarBlurhash = user?.avatarBlurhash ?? 'L6PZfSi_.AyE_3t7t7R**j_3mWj?';

  // Estado para rastrear se houve erro ao carregar a imagem do avatar
  const [imageError, setImageError] = useState(false);

  // Reseta o estado de erro quando a URL do avatar muda
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <View style={styles.container}>
      {/* Seção do Avatar com suporte a carregamento otimizado e badge de verificado */}
      <View style={styles.avatarContainer}>
        {avatarUrl && !imageError ? (
          <OptimizedImage
            source={{ uri: avatarUrl }}
            blurhash={avatarBlurhash}
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <Avatar.Text label={initial} size={80} style={styles.avatar} />
        )}
        {/* Renderiza o selo de verificação se o usuário possuir o atributo verificado */}
        {user?.verified ? (
          <VerifiedBadge />
        ) : null}
      </View>

      {/* Seção de Identificação: Nome, Handle e Biografia curta */}
      <View style={styles.texts}>
        <Text variant="titleLarge" style={styles.textCenter}>{displayName}</Text>
        <Text variant="bodyMedium" style={[styles.textCenter, { color: colors.textSecondary }]}>
          {handle}
        </Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.textCenter]}>
          {isPublicView ? '' : 'Breve descrição sobre você. Toque para editar.'}
        </Text>
      </View>

      {/* Seção de Métricas (KPIs): Exibição de estatísticas do perfil */}
      <View style={styles.metrics}>
        <Kpi label="Avaliações" value={user?.avaliacao?.toFixed(1) ?? '0.0'} />
        <Kpi label="Seguidores" value="1.2k" />
        <Kpi label="Pedidos" value="320" />
      </View>

      {/* Seção de Ações: Depende do contexto (preview, público ou próprio perfil) */}
      <View style={styles.actionsContainer}>
        {isPreview ? (
          // Modo preview: exibe informações de contato resumidas
          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.infoText}>
                {user?.telefone ? formatPhoneNumber(user.telefone) : 'Telefone não disponível'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.infoText}>
                {user?.localizacao 
                  ? `${user.localizacao.cidade} - ${user.localizacao.estado}` 
                  : 'Localização não informada'}
              </Text>
            </View>
          </View>
        ) : isPublicView ? (
          // Modo perfil público de outro usuário: exibe informações de contato (sem botão editar)
          <View style={styles.contactInfo}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={16} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.infoText}>
                {user?.telefone ? formatPhoneNumber(user.telefone) : 'Telefone não disponível'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
              <Text variant="bodyMedium" style={styles.infoText}>
                {user?.localizacao 
                  ? `${user.localizacao.cidade} - ${user.localizacao.estado}` 
                  : 'Localização não informada'}
              </Text>
            </View>
          </View>
        ) : (
          // Modo perfil próprio: exibe botão de edição
          <Button
            mode="contained"
            onPress={() => {
              // Log de evento para análise de comportamento do usuário
              AnalyticsService.track('profile_edit_click');
              // Navegação para a tela de edição de perfil Versão 2.0
              if (navigation.isReady()) {
                (navigation as any).navigate('Perfil', { screen: 'EditProfile' });
              }
            }}
          >
            Editar Perfil
          </Button>
        )}
        
        {/* Menu suspenso com opções de compartilhamento, denúncia, etc. */}
        <ProfileMoreMenu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          profileId={profileId}
          profileUrl={profileUrl}
          anchor={
            <IconButton
              testID="profile-menu-button"
              icon="dots-horizontal"
              onPress={() => {
                setMenuVisible(true);
                AnalyticsService.track('profile_more_options_click');
              }}
              style={{ marginLeft: spacing.sm }}
            />
          }
          onNavigateSettings={() => {
            if (navigation.isReady()) {
              (navigation as any).navigate('Perfil', { screen: 'Settings' });
            }
          }}
        />
      </View>
    </View>
  );
};

/**
 * Componente interno para exibição do selo de verificado.
 * Utiliza ícone decorativo e atributos de acessibilidade.
 * 
 * @returns {JSX.Element} Badge de verificação.
 */
const VerifiedBadge: React.FC = () => (
    <View
        style={styles.verifiedBadge}
        accessible
        accessibilityRole="image"
        accessibilityLabel="Perfil verificado"
    >
        <MaterialCommunityIcons
            name="check-decagram"
            size={16}
            color={colors.surface}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        />
    </View>
);

/**
 * Definições de estilos para o cabeçalho do perfil.
 */
const styles = StyleSheet.create({
  /** Container centralizador principal */
  container: {
    padding: spacing.md,
    flexDirection: 'column',
    alignItems: 'center',
  },
  /** Container relativo para posicionamento do badge sobre o avatar */
  avatarContainer: {
    position: 'relative',
  },
  /** Estilo circular para o avatar com sombra definida no tema */
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.surface,
    ...THEME_CONFIG.shadows.md,
  },
  /** Badge posicionado no canto inferior direito do avatar */
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    padding: spacing.xs,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  /** Margem superior para o bloco de textos */
  texts: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  /** Centralização genérica de texto */
  textCenter: {
    textAlign: 'center',
  },
  /** Distribuição horizontal equitativa das métricas */
  metrics: {
    marginTop: spacing.md,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 2,
  },
  /** Alinhamento horizontal para os botões de ação */
  actionsContainer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  contactInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: spacing.xs,
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default ProfileHeader;
