/**
 * Configuração e inicialização da aplicação Express.
 * Este arquivo define os middlewares globais, configurações de segurança,
 * tratamento de CORS, rotas da API e middlewares de tratamento de erro.
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';
import config from './config';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import routes from './routes';
import { requestLogger, loggerUtils } from './utils/logger';

/**
 * Instância da aplicação Express.
 */
const app: express.Application = express();

/**
 * Configura o Express para confiar em proxies (necessário para rate limiters na VPS).
 */
app.set('trust proxy', 1);

/**
 * Configurações de Segurança.
 * - Desabilita o cabeçalho 'x-powered-by' para dificultar a identificação da tecnologia.
 * - Helmet adiciona diversos cabeçalhos de segurança (HSTS, CSP, etc).
 */
app.disable('x-powered-by');

/**
 * Gera um nonce criptográfico único por requisição e o disponibiliza em res.locals.
 * Esse nonce é usado pelo Helmet CSP para permitir scripts inline específicos
 * (ex: página intermediária de deep link do reset de senha).
 */
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    // Permite scripts inline que possuam o nonce gerado para esta requisição
                    (_req: IncomingMessage, res: ServerResponse) => `'nonce-${(res as unknown as Record<string, Record<string, string>>).locals.cspNonce}'`,
                ],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https:'],
                fontSrc: ["'self'", 'https:', 'data:'],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
    })
);

/**
 * Configuração de CORS (Cross-Origin Resource Sharing).
 * Define quais origens podem acessar os recursos da API.
 */
app.use(
    cors({
        origin: (origin, callback) => {
            // Em ambiente de desenvolvimento, todas as origens são permitidas para facilitar testes.
            if (config.NODE_ENV === 'development') {
                return callback(null, true);
            }
            
            // Permite requisições sem 'origin' (ex: ferramentas locais) ou se o wildcard '*' estiver configurado.
            if (!origin || config.CORS_ORIGIN === '*') {
                return callback(null, true);
            }
            
            // Verifica se a origem da requisição está na lista branca definida nas configurações.
            if (config.CORS_ALLOWED_ORIGINS_SET.has(origin)) {
                return callback(null, true);
            }
            
            // Bloqueia o acesso para origens não autorizadas em produção.
            return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true, // Permite o envio de cookies e cabeçalhos de autorização
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
);

/**
 * Middlewares de utilidade.
 * - compression: Compacta as respostas HTTP para economizar largura de banda.
 * - json: Faz o parse de corpos de requisição em formato JSON (limite de 10mb).
 * - urlencoded: Faz o parse de corpos em formato x-www-form-urlencoded.
 */
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Middleware de Logging.
 * Registra informações detalhadas de cada requisição recebida no console/logs.
 */
app.use(requestLogger as any);

/**
 * Rota de Health Check / Boas-vindas.
 * Permite verificar rapidamente se o serviço está no ar.
 * 
 * @route GET /
 */
app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        message: 'Super App Backend ativo',
        data: {
            env: config.NODE_ENV,
            apiBase: '/api',
        },
    });
});

/**
 * Registro das Rotas da API.
 * Todas as rotas funcionais são prefixadas com '/api'.
 */
app.use('/api', routes);

/**
 * Middleware de Tratamento de Rotas Não Encontradas (404).
 * Captura qualquer requisição que não coincida com as rotas definidas anteriormente.
 */
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada',
        error: `Cannot ${req.method} ${req.originalUrl}`,
    });
});

/**
 * Middleware Global de Tratamento de Erros.
 * Captura exceções lançadas em qualquer ponto da aplicação.
 * 
 * @param {any} err - O objeto de erro capturado.
 * @param {Request} req - Objeto de requisição Express.
 * @param {Response} res - Objeto de resposta Express.
 * @param {NextFunction} _next - Função para passar o controle ao próximo middleware.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Log estruturado do erro para monitoramento e debug, filtrando dados sensíveis.
    loggerUtils.logError(err, {
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id,
        params: req.params,
        query: req.query,
    });

    // Determina o status code (padrão 500 para erros desconhecidos).
    const status = typeof err?.status === 'number' ? err.status : 500;

    res.status(status).json({
        success: false,
        message: status === 500 ? 'Erro interno do servidor' : err?.message || 'Erro',
        // Em caso de erro 500, ocultamos a mensagem detalhada por segurança.
        error: status === 500 ? undefined : err?.message,
    });
});

export default app;
