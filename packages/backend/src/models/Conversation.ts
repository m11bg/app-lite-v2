/**
 * Modelo Mongoose para Conversas do Chat.
 *
 * Este modelo representa uma conversa privada entre exatamente dois participantes.
 * Ele armazena as referências dos usuários, um snapshot da última mensagem enviada
 * (para otimização de performance na listagem) e um contador de mensagens não lidas.
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface que define a estrutura da última mensagem de uma conversa.
 * Este subdocumento é desnormalizado dentro da conversa para permitir a exibição
 * rápida do resumo na lista de conversas sem a necessidade de consultar a coleção de mensagens.
 */
interface ILastMessage {
  /** Conteúdo textual da mensagem enviada. */
  text: string;
  /** Referência ao ID do usuário (modelo User) que enviou a mensagem. */
  sender: mongoose.Types.ObjectId;
  /** Data e hora de criação da mensagem. */
  createdAt: Date;
}

/**
 * Interface que representa o documento de uma Conversa no MongoDB.
 * Estende a interface Document do Mongoose para herdar funcionalidades de documentos.
 */
export interface IConversation extends Document {
  /** 
   * Lista contendo os IDs dos dois participantes da conversa. 
   * Referencia a coleção 'User'.
   */
  participants: mongoose.Types.ObjectId[];

  /** 
   * Snapshot opcional da última mensagem enviada. 
   * Utilizado para exibição rápida de "preview" na interface do usuário.
   */
  lastMessage?: ILastMessage;

  /** 
   * Mapa de mensagens não lidas por participante.
   * A chave (string) é o ID do usuário e o valor (number) é a quantidade de mensagens pendentes.
   */
  unreadCount: Map<string, number>;

  /** Data de criação da conversa (gerada automaticamente pelo Mongoose via timestamps). */
  createdAt: Date;

  /** Data da última atualização da conversa (gerada automaticamente pelo Mongoose via timestamps). */
  updatedAt: Date;
}

/**
 * Definição do Esquema (Schema) para a coleção 'Conversation'.
 */
const ConversationSchema: Schema = new Schema(
  {
    /**
     * IDs dos participantes da conversa.
     * Deve ser um array obrigatoriamente com 2 elementos (conversa privada).
     */
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: {
        /**
         * Função de validação para garantir que a conversa tenha exatamente dois participantes.
         * @param val - O array de IDs dos participantes recebido para validação.
         * @returns Retorna true se o array contiver exatamente 2 elementos, false caso contrário.
         */
        validator: (val: unknown[]) => val.length === 2,
        message: 'A conversa deve ter exatamente dois participantes.',
      },
    },
    /**
     * Campos da última mensagem para fins de desnormalização.
     */
    lastMessage: {
      /** Texto da mensagem. */
      text: { type: String },
      /** ID do remetente (referência a User). */
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      /** Timestamp de quando a mensagem foi enviada. */
      createdAt: { type: Date },
    },
    /**
     * Armazenamento flexível para contagem de mensagens não lidas.
     */
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    /**
     * Habilita a geração automática dos campos createdAt e updatedAt.
     */
    timestamps: true,
  },
);

/**
 * Índice nos participantes para otimizar buscas de conversas por usuário.
 * Ajuda a localizar rapidamente todas as conversas onde um determinado ID está presente.
 */
ConversationSchema.index({ participants: 1 });

/**
 * Índice para ordenação por data de atualização.
 * Essencial para listar as conversas mais recentes no topo da lista de chats.
 */
ConversationSchema.index({ updatedAt: -1 });

/**
 * Exporta o modelo Mongoose 'Conversation' configurado com a interface IConversation.
 * Este modelo será utilizado para realizar operações de CRUD na coleção de conversas.
 */
export default mongoose.model<IConversation>('Conversation', ConversationSchema);

