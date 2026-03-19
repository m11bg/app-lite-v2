/**
 * ConversationListItem — Item individual na lista de conversas.
 * Exibe avatar, nome do outro participante, última mensagem e badge de não-lidas.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Badge } from 'react-native-paper';
import { colors, spacing } from '@/styles/theme';
import type { ConversationSummary, ParticipantInfo } from '@/types/chat';

interface ConversationListItemProps {
  /** Dados da conversa a exibir. */
  conversation: ConversationSummary;
  /** ID do usuário autenticado (para identificar o outro participante). */
  currentUserId: string;
  /** Callback ao pressionar o item. */
  onPress: (conversationId: string, participant: ParticipantInfo) => void;
}

/**
 * Formata uma data ISO para exibição relativa (Hoje, Ontem, ou data curta).
 */
const formatTimeAgo = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  currentUserId,
  onPress,
}) => {
  /** Identifica o outro participante da conversa. */
  const otherParticipant = useMemo(() => {
    return (
      conversation.participants.find((p) => p._id !== currentUserId) ??
      conversation.participants[0]
    );
  }, [conversation.participants, currentUserId]);

  /** Inicial do nome para avatar fallback. */
  const initial = (otherParticipant?.nome?.[0] ?? 'U').toUpperCase();

  /** Texto da última mensagem truncado. */
  const lastMessageText = conversation.lastMessage?.text ?? 'Nenhuma mensagem ainda';

  /** Timestamp formatado. */
  const timeText = conversation.lastMessage?.createdAt
    ? formatTimeAgo(conversation.lastMessage.createdAt)
    : '';

  /** Flag de não-lidas. */
  const hasUnread = conversation.unreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(conversation._id, otherParticipant)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${otherParticipant?.nome ?? 'Usuário'}${hasUnread ? `, ${conversation.unreadCount} mensagens não lidas` : ''}`}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {otherParticipant?.avatar ? (
          <Avatar.Image size={50} source={{ uri: otherParticipant.avatar }} />
        ) : (
          <Avatar.Text size={50} label={initial} />
        )}
        {hasUnread && (
          <Badge style={styles.badge} size={20}>
            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
          </Badge>
        )}
      </View>

      {/* Conteúdo textual */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            variant="titleSmall"
            style={[styles.name, hasUnread && styles.unreadText]}
            numberOfLines={1}
          >
            {otherParticipant?.nome ?? 'Usuário'}
          </Text>
          <Text variant="bodySmall" style={styles.time}>
            {timeText}
          </Text>
        </View>
        <Text
          variant="bodySmall"
          style={[styles.lastMessage, hasUnread && styles.unreadText]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {lastMessageText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.sm + 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    flex: 1,
    marginRight: spacing.sm,
    color: colors.text,
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  lastMessage: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  unreadText: {
    fontWeight: '700',
    color: colors.text,
  },
});

const MemoizedConversationListItem = React.memo(ConversationListItem);
export default MemoizedConversationListItem;

