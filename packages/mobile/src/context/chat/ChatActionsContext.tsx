/**
 * ChatActionsContext — Ações estáveis do chat.
 * Fornece funções com referência estável (useCallback) para operações do chat.
 * Componentes que consomem apenas ações NUNCA re-renderizam por mudança de estado.
 */

import React, { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { chatService } from '@/services/chatService';
import { useActiveConversation } from './ActiveConversationContext';
import type { ChatActionsContextType, Message } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';

const ChatActionsContext = createContext<ChatActionsContextType | undefined>(undefined);

interface ChatActionsProviderProps {
  children: ReactNode;
}

/**
 * Provider que expõe ações do chat com referência estável.
 * Deve ser montado DENTRO dos providers ConversationList e ActiveConversation
 * para poder interagir com seus estados.
 */
export const ChatActionsProvider: React.FC<ChatActionsProviderProps> = ({ children }) => {
  const { setConversationId, addOptimisticMessage, loadMore, refresh } = useActiveConversation();
  const { user } = useAuth();

  /** Envia uma mensagem de texto e adiciona uma versão otimista ao estado. */
  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      // Mensagem otimista para UI instantânea
      const optimisticMessage: Message = {
        _id: `temp_${Date.now()}`,
        conversationId,
        senderId: user?.id ?? '',
        content,
        type: 'text',
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      addOptimisticMessage(optimisticMessage);

      try {
        await chatService.sendMessage(conversationId, content);
        // O polling atualizará a mensagem com o _id real do backend
      } catch {
        // Em caso de erro, o polling subsequente corrigirá o estado
        // Futuramente: marcar a mensagem otimista como 'failed'
      }
    },
    [addOptimisticMessage, user?.id],
  );

  /** Cria uma conversa ou retorna a existente (idempotente). */
  const createConversation = useCallback(async (participantId: string): Promise<string> => {
    const result = await chatService.createConversation(participantId);
    return result.conversationId;
  }, []);

  /** Marca todas as mensagens da conversa como lidas. */
  const markAsRead = useCallback(async (conversationId: string) => {
    await chatService.markAsRead(conversationId);
  }, []);

  /** Abre uma conversa (define como ativa e inicia o polling de mensagens). */
  const openConversation = useCallback(
    (conversationId: string) => {
      setConversationId(conversationId);
    },
    [setConversationId],
  );

  /** Fecha a conversa ativa (para o polling de mensagens). */
  const closeConversation = useCallback(() => {
    setConversationId(null);
  }, [setConversationId]);

  /** Carrega mais mensagens (paginação). */
  const loadMoreMessages = useCallback(async () => {
    await loadMore();
  }, [loadMore]);

  /** Força atualização da conversa ativa. */
  const refreshConversations = useCallback(async () => {
    await refresh();
  }, [refresh]);

  /** Valor memoizado para evitar re-renders desnecessários nos consumidores. */
  const value = useMemo<ChatActionsContextType>(
    () => ({
      sendMessage,
      createConversation,
      markAsRead,
      openConversation,
      closeConversation,
      loadMoreMessages,
      refreshConversations,
    }),
    [sendMessage, createConversation, markAsRead, openConversation, closeConversation, loadMoreMessages, refreshConversations],
  );

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  );
};

/**
 * Hook para consumir as ações do chat.
 * @returns Funções com referência estável para operações do chat.
 */
export const useChatActions = (): ChatActionsContextType => {
  const context = useContext(ChatActionsContext);
  if (!context) {
    throw new Error('useChatActions deve ser usado dentro de ChatProvider');
  }
  return context;
};

