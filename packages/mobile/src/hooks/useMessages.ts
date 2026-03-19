/**
 * useMessages — Hook para gerenciamento de mensagens da conversa ativa.
 * Abstrai o acesso ao ActiveConversationContext e ChatActionsContext,
 * fornecendo uma interface simples para a tela de conversa.
 */

import { useCallback, useEffect } from 'react';
import { useActiveConversation } from '@/context/chat/ActiveConversationContext';
import { useChatActions } from '@/context/chat/ChatActionsContext';
import type { Message } from '@/types/chat';

interface UseMessagesResult {
  /** Lista de mensagens da conversa ativa (mais recentes primeiro). */
  messages: Message[];
  /** Se as mensagens estão carregando. */
  isLoading: boolean;
  /** Se há mais mensagens para carregar (paginação). */
  hasMore: boolean;
  /** Mensagem de erro, se houver. */
  error: string | null;
  /** Envia uma mensagem na conversa ativa. */
  sendMessage: (content: string) => Promise<void>;
  /** Carrega mais mensagens antigas (paginação). */
  loadMore: () => Promise<void>;
}

/**
 * Hook para gerenciar mensagens de uma conversa específica.
 * @param conversationId - ID da conversa a monitorar.
 */
export const useMessages = (conversationId: string): UseMessagesResult => {
  const { state } = useActiveConversation();
  const {
    sendMessage: sendMsg,
    openConversation,
    closeConversation,
    markAsRead,
    loadMoreMessages,
  } = useChatActions();

  // Abre a conversa ao montar e fecha ao desmontar
  useEffect(() => {
    openConversation(conversationId);
    void markAsRead(conversationId);

    return () => {
      closeConversation();
    };
  }, [conversationId, openConversation, closeConversation, markAsRead]);

  /** Envia mensagem na conversa ativa. */
  const sendMessage = useCallback(
    async (content: string) => {
      await sendMsg(conversationId, content);
    },
    [sendMsg, conversationId],
  );

  /** Carrega mais mensagens antigas. */
  const loadMore = useCallback(async () => {
    await loadMoreMessages();
  }, [loadMoreMessages]);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    hasMore: state.hasMore,
    error: state.error,
    sendMessage,
    loadMore,
  };
};

