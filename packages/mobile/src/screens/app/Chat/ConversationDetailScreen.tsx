/**
 * ConversationDetailScreen — Tela de mensagens de uma conversa.
 * Exibe as mensagens em FlatList invertida com composer na parte inferior.
 * Marca a conversa como lida ao montar.
 */

import React, { useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeContainer } from '@/components/common/SafeContainer';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageComposer from '@/components/chat/MessageComposer';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/styles/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ChatStackParamList, Message } from '@/types';

type Props = NativeStackScreenProps<ChatStackParamList, 'ConversationDetail'>;

const ConversationDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, participant } = route.params;
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const {
    messages,
    isLoading,
    hasMore,
    sendMessage,
    loadMore,
  } = useMessages(conversationId);

  // Define o título da tela com o nome do participante
  useEffect(() => {
    navigation.setOptions({
      title: participant.nome,
    });
  }, [navigation, participant.nome]);

  /** Envia mensagem via composer. */
  const handleSend = useCallback(
    (content: string) => {
      void sendMessage(content);
    },
    [sendMessage],
  );

  /** Carrega mais mensagens quando chega ao final da lista. */
  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoading) {
      void loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  /** Renderiza uma bolha de mensagem. */
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isMine={item.senderId === currentUserId}
      />
    ),
    [currentUserId],
  );

  /** Key extractor para FlatList. */
  const keyExtractor = useCallback((item: Message) => item._id, []);

  /** Footer da lista (indicador de carregamento de mensagens antigas). */
  const ListFooter = useCallback(() => {
    if (!isLoading || messages.length === 0) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isLoading, messages.length]);

  /** Componente de lista vazia. */
  const EmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="bodyMedium" style={styles.emptyText}>
            Carregando mensagens...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodyLarge" style={styles.emptyText}>
          Nenhuma mensagem ainda
        </Text>
        <Text variant="bodyMedium" style={styles.emptySubtext}>
          Envie a primeira mensagem para {participant.nome}!
        </Text>
      </View>
    );
  }, [isLoading, participant.nome]);

  return (
    <SafeContainer edges={['bottom']}>
      <View style={styles.container}>
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={
            messages.length === 0 ? styles.emptyList : styles.messageList
          }
          ListFooterComponent={ListFooter}
          ListEmptyComponent={EmptyComponent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
        <MessageComposer onSend={handleSend} />
      </View>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    paddingVertical: spacing.sm,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    // FlatList invertida: o "empty" precisa estar rotacionado para aparecer correto
    transform: [{ scaleY: -1 }],
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.md,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingFooter: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});

export default ConversationDetailScreen;

