/**
 * Serviço de negócio do Chat.
 * Encapsula toda a lógica de dados para conversas e mensagens,
 * garantindo idempotência na criação de conversas e integridade das operações.
 */

import mongoose from 'mongoose';
import Conversation, { IConversation } from '../models/Conversation';
import Message, { IMessage } from '../models/Message';

/** Resultado paginado de mensagens. */
export interface PaginatedMessages {
  messages: IMessage[];
  hasMore: boolean;
}

/** Resultado de listagem de conversas com dados populados dos participantes. */
export interface ConversationWithParticipants {
  _id: string;
  participants: Array<{
    _id: string;
    nome: string;
    avatar?: string;
  }>;
  lastMessage?: {
    text: string;
    sender: string;
    createdAt: Date;
  };
  unreadCount: number;
  updatedAt: Date;
}

/**
 * Objeto de serviço que agrupa a lógica de negócio do Chat.
 * Segue o padrão singleton-object do projeto (vide interactionService).
 */
export const chatService = {
  /**
   * Cria uma nova conversa ou retorna a existente entre dois usuários.
   * Garante idempotência ordenando os IDs dos participantes antes da busca.
   *
   * @param userId - ID do usuário autenticado (remetente).
   * @param recipientId - ID do destinatário.
   * @returns Documento da conversa criada ou existente.
   */
  async createOrGetConversation(
    userId: string,
    recipientId: string,
  ): Promise<IConversation> {
    // Ordena IDs para garantir consistência na busca (evita duplicatas A↔B vs B↔A)
    const sortedParticipants = [userId, recipientId]
      .map((id) => new mongoose.Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));

    // Tenta encontrar conversa existente entre os dois participantes
    const existing = await Conversation.findOne({
      participants: { $all: sortedParticipants, $size: 2 },
    });

    if (existing) {
      return existing;
    }

    // Cria nova conversa com contagem de não-lidas zerada
    const conversation = await Conversation.create({
      participants: sortedParticipants,
      unreadCount: new Map([
        [userId, 0],
        [recipientId, 0],
      ]),
    });

    return conversation;
  },

  /**
   * Lista todas as conversas de um usuário, ordenadas pela última atualização.
   * Popula informações básicas dos participantes (nome, avatar).
   *
   * @param userId - ID do usuário autenticado.
   * @returns Lista de conversas com dados dos participantes e contagem de não-lidas.
   */
  async getConversations(userId: string): Promise<ConversationWithParticipants[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Conversation.find({
      participants: userObjectId,
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'nome avatar')
      .lean();

    return conversations.map((conv) => {
      const unreadMap = conv.unreadCount instanceof Map
        ? conv.unreadCount
        : new Map(Object.entries(conv.unreadCount || {}));

      return {
        _id: String(conv._id),
        participants: (conv.participants as unknown as Array<{ _id: mongoose.Types.ObjectId; nome: string; avatar?: string }>).map(
          (p) => ({
            _id: String(p._id),
            nome: p.nome,
            avatar: p.avatar,
          }),
        ),
        lastMessage: conv.lastMessage
          ? {
              text: conv.lastMessage.text,
              sender: String(conv.lastMessage.sender),
              createdAt: conv.lastMessage.createdAt,
            }
          : undefined,
        unreadCount: Number(unreadMap.get(userId) ?? 0),
        updatedAt: conv.updatedAt,
      };
    });
  },

  /**
   * Lista mensagens de uma conversa com paginação baseada em cursor.
   * Retorna as mensagens mais recentes primeiro (para FlatList invertida).
   *
   * @param conversationId - ID da conversa.
   * @param limit - Número máximo de mensagens a retornar (padrão: 30).
   * @param before - Cursor: retorna mensagens anteriores a este ID.
   * @returns Objeto com array de mensagens e flag indicando se há mais.
   */
  async getMessages(
    conversationId: string,
    limit: number = 30,
    before?: string,
  ): Promise<PaginatedMessages> {
    const query: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

    // Paginação por cursor: busca mensagens com _id menor que o cursor
    if (before) {
      query._id = { $lt: new mongoose.Types.ObjectId(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1) // Busca +1 para verificar se há mais
      .lean();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove o item extra usado para detecção de "hasMore"
    }

    return {
      messages: messages as unknown as IMessage[],
      hasMore,
    };
  },

  /**
   * Envia uma nova mensagem em uma conversa.
   * Atualiza atomicamente o snapshot da última mensagem e incrementa
   * a contagem de não-lidas do destinatário.
   *
   * @param conversationId - ID da conversa.
   * @param senderId - ID do remetente.
   * @param content - Conteúdo textual da mensagem.
   * @returns Documento da mensagem criada.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
  ): Promise<IMessage> {
    const convObjectId = new mongoose.Types.ObjectId(conversationId);
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    // Cria a mensagem
    const message = await Message.create({
      conversationId: convObjectId,
      sender: senderObjectId,
      content,
      type: 'text',
      status: 'sent',
    });

    // Busca a conversa para identificar o destinatário
    const conversation = await Conversation.findById(convObjectId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Identifica o outro participante para incrementar unreadCount
    const recipientId = conversation.participants.find(
      (p) => p.toString() !== senderId,
    );

    // Atualiza a conversa atomicamente
    const updateFields: Record<string, unknown> = {
      lastMessage: {
        text: content,
        sender: senderObjectId,
        createdAt: message.createdAt,
      },
      updatedAt: new Date(),
    };

    if (recipientId) {
      updateFields[`unreadCount.${recipientId.toString()}`] =
        (conversation.unreadCount.get(recipientId.toString()) ?? 0) + 1;
    }

    await Conversation.findByIdAndUpdate(convObjectId, { $set: updateFields });

    return message;
  },

  /**
   * Marca todas as mensagens de uma conversa como lidas para o usuário.
   * Zera a contagem de não-lidas do usuário e atualiza o status das mensagens.
   *
   * @param conversationId - ID da conversa.
   * @param userId - ID do usuário que está marcando como lida.
   */
  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const convObjectId = new mongoose.Types.ObjectId(conversationId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Zera a contagem de não-lidas do usuário na conversa
    await Conversation.findByIdAndUpdate(convObjectId, {
      $set: { [`unreadCount.${userId}`]: 0 },
    });

    // Atualiza status das mensagens do OUTRO participante para 'read'
    await Message.updateMany(
      {
        conversationId: convObjectId,
        sender: { $ne: userObjectId },
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } },
    );
  },

  /**
   * Verifica se um usuário é participante de uma conversa.
   * Usado para autorização nos endpoints.
   *
   * @param conversationId - ID da conversa.
   * @param userId - ID do usuário.
   * @returns True se o usuário é participante.
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const conversation = await Conversation.findOne({
      _id: new mongoose.Types.ObjectId(conversationId),
      participants: new mongoose.Types.ObjectId(userId),
    });
    return !!conversation;
  },
};

