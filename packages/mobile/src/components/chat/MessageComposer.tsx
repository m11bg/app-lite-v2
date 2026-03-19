/**
 * MessageComposer — Campo de texto e botão de envio de mensagens.
 * Componente de apresentação com estado local para o texto digitado.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors, spacing, radius } from '@/styles/theme';

interface MessageComposerProps {
  /** Callback para envio da mensagem com o conteúdo textual. */
  onSend: (content: string) => void;
  /** Se o envio está em andamento (desabilita o botão). */
  isSending?: boolean;
}

const MessageComposer: React.FC<MessageComposerProps> = ({ onSend, isSending = false }) => {
  const [text, setText] = useState('');

  /** Envia a mensagem e limpa o campo. */
  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setText('');
  }, [text, isSending, onSend]);

  const canSend = text.trim().length > 0 && !isSending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            returnKeyType="default"
            accessibilityLabel="Campo de mensagem"
            editable={!isSending}
          />
        </View>
        <IconButton
          icon="send"
          mode="contained"
          size={22}
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          iconColor={canSend ? '#FFFFFF' : colors.textSecondary}
          accessibilityLabel="Enviar mensagem"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    marginRight: spacing.sm,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    minHeight: 36,
    paddingVertical: Platform.OS === 'android' ? spacing.xs + 2 : 0,
  },
  sendButton: {
    marginBottom: 2,
    backgroundColor: colors.border,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
});

const MemoizedMessageComposer = React.memo(MessageComposer);
export default MemoizedMessageComposer;

