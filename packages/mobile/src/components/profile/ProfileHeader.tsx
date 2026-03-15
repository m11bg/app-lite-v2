import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
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

import { formatPhoneForDisplay, toE164Digits } from '@/utils/phoneFormatter';
import { showAlert } from '@/utils/alert';

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

  /**
   * Abre o discador nativo com o número de telefone.
   * Verifica se o dispositivo suporta o protocolo tel: antes de abrir.
   */
  const handleCall = useCallback(async (phone: string): Promise<void> => {
    const digits = toE164Digits(phone);
    // Para ligação, usa apenas os dígitos nacionais (sem código do país)
    const nationalDigits = digits.startsWith('55') ? digits.slice(2) : digits;
    const url = `tel:${nationalDigits}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        AnalyticsService.track('profile_phone_call', { profileId });
        await Linking.openURL(url);
      } else {
        showAlert('Erro', 'Não foi possível abrir o discador neste dispositivo.');
      }
    } catch {
      showAlert('Erro', 'Ocorreu um erro ao tentar fazer a ligação.');
    }
  }, [profileId]);

  /**
   * Abre o WhatsApp com o número do prestador.
   * Utiliza o formato internacional (com código 55 do Brasil).
   */
  const handleWhatsApp = useCallback(async (phone: string): Promise<void> => {
    const waNumber = toE164Digits(phone);
    const url = `https://wa.me/${waNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        AnalyticsService.track('profile_whatsapp_click', { profileId });
        await Linking.openURL(url);
      } else {
        showAlert(
          'WhatsApp indisponível',
          'Não foi possível abrir o WhatsApp. Verifique se o app está instalado.'
        );
      }
    } catch {
      showAlert('Erro', 'Ocorreu um erro ao tentar abrir o WhatsApp.');
    }
  }, [profileId]);

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
        {(isPreview || isPublicView) ? (
          <ContactInfo
            user={user}
            onCall={handleCall}
            onWhatsApp={handleWhatsApp}
          />
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
 * Informações de contato do prestador com ações de ligação e WhatsApp.
 */
interface ContactInfoProps {
  user: PrestadorResumo | null;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
}

const ContactInfo: React.FC<ContactInfoProps> = ({ user, onCall, onWhatsApp }) => (
  <View style={styles.contactInfo}>
    {/* Linha do Telefone com ações de contato */}
    <View style={styles.phoneRow}>
      {user?.telefone ? (
        <>
          <TouchableOpacity
            onPress={() => onCall(user.telefone!)}
            accessibilityRole="button"
            accessibilityLabel={`Ligar para ${formatPhoneForDisplay(user.telefone)}`}
            activeOpacity={0.7}
            style={styles.phoneAction}
          >
            <MaterialCommunityIcons name="phone" size={18} color={colors.primary} />
          </TouchableOpacity>

          <Text variant="bodyMedium" style={styles.infoText}>
            {formatPhoneForDisplay(user.telefone)}
          </Text>

          <TouchableOpacity
            onPress={() => onWhatsApp(user.telefone!)}
            accessibilityRole="button"
            accessibilityLabel="Abrir conversa no WhatsApp"
            activeOpacity={0.7}
            style={styles.phoneAction}
          >
            <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="phone-off" size={16} color={colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.infoText}>
            Telefone não disponível
          </Text>
        </>
      )}
    </View>

    {/* Linha da Localização (sem alteração de comportamento) */}
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name="map-marker" size={16} color={colors.primary} />
      <Text variant="bodyMedium" style={styles.infoText}>
        {user?.localizacao
          ? `${user.localizacao.cidade} - ${user.localizacao.estado}`
          : 'Localização não informada'}
      </Text>
    </View>
  </View>
);

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
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneAction: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
});

export default ProfileHeader;
