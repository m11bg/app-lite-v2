/**
 * Serviço de API do Chat (Mobile).
 * Encapsula as chamadas REST para os endpoints do chat no backend.
 * Utiliza a instância Axios compartilhada do projeto.
 */

import { api } from './api';
import type {
  ConversationSummary,
  CreateConversationResponse,
  GetMessagesResponse,
  Message,
} from '@/types/chat';

/** Prefixo base dos endpoints de chat. */
const CHAT_BASE = 'v1/chat';

/**
 * Serviço de chat para comunicação com o backend.
 * Todos os métodos requerem autenticação (token JWT é anexado automaticamente pelo interceptor).
 */
export const chatService = {
  /**
   * Lista todas as conversas do usuário autenticado.
   * @returns Lista de conversas com dados dos participantes e última mensagem.
   */
  async getConversations(): Promise<ConversationSummary[]> {
    const response = await api.get(`${CHAT_BASE}/conversations`);
    return response.data?.data ?? [];
  },

  /**
   * Cria uma nova conversa ou retorna a existente (idempotente).
   * @param recipientId - ID do usuário com quem iniciar a conversa.
   * @returns ID da conversa criada ou existente.
   */
  async createConversation(recipientId: string): Promise<CreateConversationResponse> {
    const response = await api.post(`${CHAT_BASE}/conversations`, { recipientId });
    return response.data?.data;
  },

  /**
   * Lista mensagens de uma conversa com paginação.
   * @param conversationId - ID da conversa.
   * @param limit - Número máximo de mensagens (padrão: 30).
   * @param before - Cursor: ID da mensagem anterior para paginação.
   * @returns Mensagens e flag indicando se há mais.
   */
  async getMessages(
    conversationId: string,
    limit: number = 30,
    before?: string,
  ): Promise<GetMessagesResponse> {
    const params: Record<string, string | number> = { limit };
    if (before) {
      params.before = before;
    }
    const response = await api.get(
      `${CHAT_BASE}/conversations/${conversationId}/messages`,
      { params },
    );
    return response.data?.data ?? { messages: [], hasMore: false };
  },

  /**
   * Envia uma mensagem de texto em uma conversa.
   * @param conversationId - ID da conversa.
   * @param content - Conteúdo textual da mensagem.
   * @returns Mensagem criada pelo backend.
   */
  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const response = await api.post(
      `${CHAT_BASE}/conversations/${conversationId}/messages`,
      { content, type: 'text' },
    );
    return response.data?.data;
  },

  /**
   * Marca todas as mensagens de uma conversa como lidas.
   * @param conversationId - ID da conversa.
   */
  async markAsRead(conversationId: string): Promise<void> {
    await api.patch(`${CHAT_BASE}/conversations/${conversationId}/read`);
  },
};

