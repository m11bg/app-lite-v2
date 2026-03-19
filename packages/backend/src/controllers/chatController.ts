/**
 * Controller do Chat.
 * Processa requisições HTTP dos endpoints do chat,
 * delegando a lógica ao chatService e garantindo autorização.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { chatService } from '../services/chatService';
import User from '../models/User';
import logger from '../utils/logger';

/**
 * Controller responsável por gerenciar as operações do Chat.
 * Todos os endpoints requerem autenticação via JWT.
 */
export const chatController = {
  /**
   * POST /api/v1/chat/conversations
   * Cria uma nova conversa ou retorna existente (idempotência).
   */
  async createConversation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { recipientId } = req.body;

      // Impede conversa consigo mesmo
      if (recipientId === userId) {
        res.status(400).json({
          success: false,
          message: 'Não é possível iniciar uma conversa consigo mesmo',
        });
        return;
      }

      // Verifica se o destinatário existe e está ativo
      const recipient = await User.findById(recipientId);
      if (!recipient || !recipient.ativo) {
        res.status(404).json({
          success: false,
          message: 'Destinatário não encontrado',
        });
        return;
      }

      const conversation = await chatService.createOrGetConversation(userId, recipientId);

      res.status(200).json({
        success: true,
        message: 'Conversa criada com sucesso',
        data: {
          conversationId: conversation._id,
        },
      });
    } catch (error) {
      logger.error('Erro ao criar conversa:', error);
      next(error);
    }
  },

  /**
   * GET /api/v1/chat/conversations
   * Lista todas as conversas do usuário autenticado.
   */
  async getConversations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const conversations = await chatService.getConversations(userId);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error('Erro ao listar conversas:', error);
      next(error);
    }
  },

  /**
   * GET /api/v1/chat/conversations/:id/messages
   * Lista mensagens de uma conversa com paginação.
   */
  async getMessages(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { id } = req.params;

      // Autorização: verifica se o usuário é participante da conversa
      const isParticipant = await chatService.isParticipant(id, userId);
      if (!isParticipant) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar esta conversa',
        });
        return;
      }

      const limit = parseInt(req.query.limit as string, 10) || 30;
      const before = req.query.before as string | undefined;

      const result = await chatService.getMessages(id, Math.min(limit, 50), before);

      res.status(200).json({
        success: true,
        data: {
          messages: result.messages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      logger.error('Erro ao listar mensagens:', error);
      next(error);
    }
  },

  /**
   * POST /api/v1/chat/conversations/:id/messages
   * Envia uma nova mensagem para a conversa.
   */
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { id } = req.params;
      const { content } = req.body;

      // Autorização: verifica se o usuário é participante da conversa
      const isParticipant = await chatService.isParticipant(id, userId);
      if (!isParticipant) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para enviar mensagens nesta conversa',
        });
        return;
      }

      const message = await chatService.sendMessage(id, userId, content);

      res.status(201).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        data: message,
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', error);
      next(error);
    }
  },

  /**
   * PATCH /api/v1/chat/conversations/:id/read
   * Marca todas as mensagens da conversa como lidas para o usuário.
   */
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Usuário não autenticado' });
        return;
      }

      const { id } = req.params;

      // Autorização: verifica se o usuário é participante da conversa
      const isParticipant = await chatService.isParticipant(id, userId);
      if (!isParticipant) {
        res.status(403).json({
          success: false,
          message: 'Você não tem permissão para acessar esta conversa',
        });
        return;
      }

      await chatService.markAsRead(id, userId);

      res.status(200).json({
        success: true,
        message: 'Conversa marcada como lida',
      });
    } catch (error) {
      logger.error('Erro ao marcar conversa como lida:', error);
      next(error);
    }
  },
};

