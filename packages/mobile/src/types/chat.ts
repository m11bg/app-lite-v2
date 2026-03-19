/**
 * Tipos TypeScript para o módulo de Chat.
 * Define interfaces para mensagens, conversas, participantes e estados dos contexts.
 */

/** Status de entrega/leitura de uma mensagem. */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** Uma mensagem individual dentro de uma conversa. */
export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video';
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
}

/** Informações básicas de um participante. */
export interface ParticipantInfo {
  _id: string;
  nome: string;
  avatar?: string;
}

/** Resumo de uma conversa para exibição na lista. */
export interface ConversationSummary {
  _id: string;
  participants: ParticipantInfo[];
  lastMessage?: {
    text: string;
    sender: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

// ---------- Context State Interfaces ----------

/** Estado da lista de conversas (ConversationListContext). */
export interface ConversationListState {
  conversations: ConversationSummary[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
}

/** Estado da conversa ativa (ActiveConversationContext). */
export interface ActiveConversationState {
  conversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

/** Ações do chat — referências estáveis via useCallback (ChatActionsContext). */
export interface ChatActionsContextType {
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (participantId: string) => Promise<string>;
  markAsRead: (conversationId: string) => Promise<void>;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  loadMoreMessages: () => Promise<void>;
  refreshConversations: () => Promise<void>;
}

/** Resposta da API ao criar conversa. */
export interface CreateConversationResponse {
  conversationId: string;
}

/** Resposta da API ao listar mensagens. */
export interface GetMessagesResponse {
  messages: Message[];
  hasMore: boolean;
}

