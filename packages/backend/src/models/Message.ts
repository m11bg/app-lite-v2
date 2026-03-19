/**
 * Modelo Mongoose para Mensagens do Chat.
 * Representa uma mensagem individual dentro de uma conversa.
 * Fase 1: somente mensagens de texto.
 */

import mongoose, { Document, Schema } from 'mongoose';

/** Status possíveis de uma mensagem. */
export type MessageStatusType = 'sent' | 'delivered' | 'read';

/** Interface do documento Message no MongoDB. */
export interface IMessage extends Document {
  /** Referência à conversa que contém esta mensagem. */
  conversationId: mongoose.Types.ObjectId;
  /** ID do remetente da mensagem. */
  sender: mongoose.Types.ObjectId;
  /** Conteúdo textual da mensagem (máx. 1000 caracteres). */
  content: string;
  /** Tipo da mensagem (Fase 1: somente 'text'). */
  type: 'text';
  /** Status de entrega da mensagem. */
  status: MessageStatusType;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Mensagem não pode exceder 1000 caracteres.'],
    },
    type: {
      type: String,
      enum: ['text'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

/**
 * Índice composto para busca paginada de mensagens por conversa,
 * ordenadas cronologicamente (mais recentes primeiro para scroll invertido).
 */
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', MessageSchema);

