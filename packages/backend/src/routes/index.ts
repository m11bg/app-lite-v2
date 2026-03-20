/**
 * Ponto central de roteamento da API.
 * Este arquivo concentra e distribui as requisições para os diferentes módulos
 * da aplicação (autenticação, usuários, ofertas, interações, etc.).
 */

import { Router } from 'express';
import type { Router as ExpressRouter, Request, Response, RequestHandler } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import uploadRoutes from './uploadRoutes';
import ofertaRoutes from './ofertaRoutes';
import interactionRoutes from './interactionRoutes';
import chatRoutes from './chatRoutes';
import { generalLimiter } from '../middleware/rateLimiter';
import config from '../config';
import { isDbReady } from '../config/database';

/**
 * Instância do roteador principal que agrega todas as rotas da aplicação.
 */
const router: ExpressRouter = Router();

/**
 * Rotas de chat — registradas ANTES do generalLimiter.
 * O chat possui rate limiters próprios (chatReadLimiter e sendMessageLimiter)
 * que são mais adequados para a frequência de polling necessária.
 * O generalLimiter (100 req/15min) é muito restritivo para o polling do chat.
 */
router.use('/v1/chat', chatRoutes);     // Rotas de chat (conversas e mensagens) na v1

/**
 * Middleware de Rate Limiting global.
 * Aplica uma restrição de taxa de requisições para proteger a API
 * contra abusos e ataques de negação de serviço (DoS).
 * Nota: rotas de chat são isentas (possuem rate limiting próprio acima).
 */
const generalLimiterMw: RequestHandler = generalLimiter as unknown as RequestHandler;
router.use(generalLimiterMw);

/**
 * Registro de rotas modulares (protegidas pelo generalLimiter).
 */
router.use('/auth', authRoutes);         // Rotas de autenticação (Login, Registro, Senha)
router.use('/v1/users', userRoutes);    // Rotas de perfil e gestão de usuários (v1)
router.use('/upload', uploadRoutes);    // Rotas para upload de mídias e arquivos
router.use('/ofertas', ofertaRoutes);   // Rotas para gestão e consulta de ofertas de serviço
router.use('/v1', interactionRoutes);   // Rotas de interação (likes/dislikes) integradas na v1

/**
 * Endpoint de Health Check.
 * Fornece informações básicas sobre o estado da API e da conexão com o banco de dados.
 * 
 * @route GET /health
 */
router.get('/health', ({}: Request, res: Response) => {
    const dbConnected = isDbReady();
    const skipDb = config.SKIP_DB;
    res.json({
        success: true,
        message: 'Super App API funcionando!',
        data: {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            dbConnected,
            skipDb,
        }
    });
});

export default router;