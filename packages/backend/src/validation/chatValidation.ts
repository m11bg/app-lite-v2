/**
 * Schemas de validação Zod para os endpoints do Chat.
 * Garante integridade dos dados de entrada antes de processamento pelo serviço.
 */

import { z } from 'zod';

/** Regex para validação de ObjectIds do MongoDB. */
const objectIdRegex = /^[a-f\d]{24}$/i;

/**
 * Validação para criação de conversa.
 * Exige um recipientId válido (ObjectId de 24 caracteres hexadecimais).
 */
export const createConversationSchema = z.object({
  body: z.object({
    recipientId: z
      .string({ required_error: 'recipientId é obrigatório' })
      .regex(objectIdRegex, 'recipientId deve ser um ObjectId válido'),
  }),
});

/**
 * Validação para envio de mensagem.
 * Exige conteúdo textual não vazio com no máximo 1000 caracteres.
 */
export const sendMessageSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Conteúdo da mensagem é obrigatório' })
      .min(1, 'Mensagem não pode ser vazia')
      .max(1000, 'Mensagem não pode exceder 1000 caracteres'),
    type: z.literal('text').optional().default('text'),
  }),
});

/**
 * Validação de parâmetros de rota que contêm um ID de conversa.
 */
export const conversationIdParamSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'ID da conversa é obrigatório' })
      .regex(objectIdRegex, 'ID da conversa deve ser um ObjectId válido'),
  }),
});

/**
 * Validação de query params para paginação de mensagens.
 * Suporta paginação baseada em cursor (before) e limit.
 */
export const getMessagesQuerySchema = z.object({
  params: z.object({
    id: z
      .string()
      .regex(objectIdRegex, 'ID da conversa deve ser um ObjectId válido'),
  }),
  query: z.object({
    limit: z
      .string()
      .optional()
      .default('30')
      .transform((val) => {
        const num = parseInt(val, 10);
        return isNaN(num) || num < 1 ? 30 : Math.min(num, 50);
      }),
    before: z
      .string()
      .optional()
      .refine((val) => !val || objectIdRegex.test(val), {
        message: 'Cursor "before" deve ser um ObjectId válido',
      }),
  }),
});

