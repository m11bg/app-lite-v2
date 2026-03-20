/**
 * Rotas REST do Chat.
 * Define os 5 endpoints da Fase 1 do chat, todos protegidos por autenticação.
 * Inclui rate limiting específico para leitura (polling) e envio de mensagens.
 */

import { Router } from 'express';
import type { Router as ExpressRouter, RequestHandler } from 'express';
import { chatController } from '../controllers/chatController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createConversationSchema,
  sendMessageSchema,
  conversationIdParamSchema,
  getMessagesQuerySchema,
} from '../validation/chatValidation';
import rateLimit from 'express-rate-limit';

const router: ExpressRouter = Router();

const isTest = process.env.NODE_ENV === 'test';

/**
 * Rate limiter específico para leitura do chat (polling).
 * Limite generoso para suportar polling de conversas e mensagens sem
 * colidir com o generalLimiter global (que é mais restritivo).
 * 60 requisições por minuto por IP — suficiente para polling a cada 15s
 * de mensagens + 30s da lista de conversas para múltiplos usuários.
 */
const chatReadLimiter: RequestHandler = isTest
  ? ((_req, _res, next) => { next(); }) as RequestHandler
  : rateLimit({
      windowMs: 60 * 1000, // 1 minuto
      limit: 60,
      message: {
        success: false,
        message: 'Muitas requisições ao chat. Aguarde um momento.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }) as unknown as RequestHandler;

/**
 * Rate limiter específico para envio de mensagens.
 * Limita a 30 mensagens por minuto por IP para prevenir spam.
 */
const sendMessageLimiter: RequestHandler = isTest
  ? ((_req, _res, next) => { next(); }) as RequestHandler
  : rateLimit({
      windowMs: 60 * 1000, // 1 minuto
      limit: 30,
      message: {
        success: false,
        message: 'Muitas mensagens enviadas. Aguarde um momento antes de enviar novas mensagens.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }) as unknown as RequestHandler;

/**
 * Todas as rotas de chat exigem autenticação via JWT.
 */
router.use(authMiddleware as RequestHandler);

/**
 * GET /api/v1/chat/conversations
 * Lista todas as conversas do usuário autenticado, ordenadas por última atualização.
 */
router.get('/conversations', chatReadLimiter, chatController.getConversations as RequestHandler);

/**
 * POST /api/v1/chat/conversations
 * Cria uma nova conversa ou retorna existente (comportamento idempotente).
 * Body: { recipientId: string }
 */
router.post(
  '/conversations',
  validate(createConversationSchema) as RequestHandler,
  chatController.createConversation as RequestHandler,
);

/**
 * GET /api/v1/chat/conversations/:id/messages
 * Lista mensagens de uma conversa com paginação (cursor-based).
 * Query: { limit?: number, before?: string }
 */
router.get(
  '/conversations/:id/messages',
  chatReadLimiter,
  validate(getMessagesQuerySchema) as RequestHandler,
  chatController.getMessages as RequestHandler,
);

/**
 * POST /api/v1/chat/conversations/:id/messages
 * Envia uma nova mensagem de texto para a conversa.
 * Body: { content: string, type?: 'text' }
 */
router.post(
  '/conversations/:id/messages',
  sendMessageLimiter,
  validate(sendMessageSchema) as RequestHandler,
  chatController.sendMessage as RequestHandler,
);

/**
 * PATCH /api/v1/chat/conversations/:id/read
 * Marca todas as mensagens da conversa como lidas para o usuário autenticado.
 */
router.patch(
  '/conversations/:id/read',
  validate(conversationIdParamSchema) as RequestHandler,
  chatController.markAsRead as RequestHandler,
);

export default router;

