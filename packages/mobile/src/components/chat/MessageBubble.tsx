/**
 * MessageBubble — Bolha de mensagem individual (enviada ou recebida).
 * Componente de apresentação puro, renderizado via props (não consome Context).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';
import type { Message, MessageStatus } from '@/types/chat';

interface MessageBubbleProps {
  /** Dados completos da mensagem. */
  message: Message;
  /** Se a mensagem foi enviada pelo usuário autenticado. */
  isMine: boolean;
}

/**
 * Formata horário da mensagem para exibição (HH:MM).
 */
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Retorna ícone de status de envio para mensagens do próprio usuário.
 */
const getStatusIcon = (status: MessageStatus): string => {
  switch (status) {
    case 'sending':
      return '◷';
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    case 'failed':
      return '✕';
    default:
      return '';
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMine }) => {
  const statusIcon = isMine ? getStatusIcon(message.status) : '';
  const isOptimistic = message._id.startsWith('temp_');

  return (
    <View
      style={[
        styles.wrapper,
        isMine ? styles.wrapperMine : styles.wrapperOther,
      ]}
      accessibilityLabel={`${isMine ? 'Mensagem enviada' : 'Mensagem recebida'}: ${message.content}`}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          isOptimistic && styles.bubbleOptimistic,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isMine ? styles.textMine : styles.textOther,
          ]}
        >
          {message.content}
        </Text>
        <View style={styles.metaRow}>
          <Text
            style={[
              styles.timeText,
              isMine ? styles.timeMine : styles.timeOther,
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>
          {isMine && statusIcon ? (
            <Text
              style={[
                styles.statusText,
                message.status === 'read' && styles.statusRead,
                message.status === 'failed' && styles.statusFailed,
              ]}
            >
              {' '}{statusIcon}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    width: '100%',
  },
  wrapperMine: {
    alignItems: 'flex-end',
  },
  wrapperOther: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleOptimistic: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMine: {
    color: '#FFFFFF',
  },
  textOther: {
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
  },
  timeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeOther: {
    color: colors.textSecondary,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  statusRead: {
    color: '#4FC3F7',
  },
  statusFailed: {
    color: '#FF5252',
  },
});

const MemoizedMessageBubble = React.memo(MessageBubble);
export default MemoizedMessageBubble;

