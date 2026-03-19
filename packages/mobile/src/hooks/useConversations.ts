/**
 * useConversations — Hook para gerenciamento da lista de conversas.
 * Abstrai o acesso ao ConversationListContext e ChatActionsContext,
 * fornecendo uma interface simples para componentes de lista.
 */

import { useCallback } from 'react';
import { useConversationList } from '@/context/chat/ConversationListContext';
import { useChatActions } from '@/context/chat/ChatActionsContext';
import type { ConversationSummary, ParticipantInfo } from '@/types/chat';

interface UseConversationsResult {
  /** Lista de conversas ordenada pela última atualização. */
  conversations: ConversationSummary[];
  /** Total de mensagens não lidas em todas as conversas. */
  totalUnread: number;
  /** Se a lista está carregando. */
  isLoading: boolean;
  /** Mensagem de erro, se houver. */
  error: string | null;
  /** Abre uma conversa específica. */
  openConversation: (conversationId: string, participant: ParticipantInfo) => void;
}

/**
 * Hook que combina estado e ações da lista de conversas.
 * @param onNavigate - Callback para navegação ao abrir uma conversa.
 */
export const useConversations = (
  onNavigate?: (conversationId: string, participant: ParticipantInfo) => void,
): UseConversationsResult => {
  const { conversations, totalUnread, isLoading, error } = useConversationList();
  const { openConversation: openConv } = useChatActions();

  const openConversation = useCallback(
    (conversationId: string, participant: ParticipantInfo) => {
      openConv(conversationId);
      onNavigate?.(conversationId, participant);
    },
    [openConv, onNavigate],
  );

  return {
    conversations,
    totalUnread,
    isLoading,
    error,
    openConversation,
  };
};

