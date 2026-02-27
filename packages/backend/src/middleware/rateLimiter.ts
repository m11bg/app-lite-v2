import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Em ambiente de teste, desabilitar rate limiter para evitar instabilidade nos testes automatizados.
const isTest = process.env.NODE_ENV === 'test';
const passThrough = (req: Request, res: Response, next: NextFunction) => {
    // Marcar como intencionalmente não utilizados para evitar alertas do compilador.
    void req;
    void res;
    next();
};

/**
 * loginLimiter: Protege contra ataques de força bruta no login.
 * Limite de 5 tentativas a cada 15 minutos.
 */
export const loginLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        limit: 5, // Usando 'limit' conforme versão 7.x
        message: {
            success: false,
            message: 'Muitas tentativas de login falhas. Por favor, tente novamente em 15 minutos ou redefina sua senha.',
            error: 'Muitas tentativas de login falhas. Por favor, tente novamente em 15 minutos ou redefina sua senha.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

/**
 * registerLimiter: Evita spam de criação de contas.
 * Limite de 3 contas por hora.
 */
export const registerLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hora
        limit: 3,
        message: {
            success: false,
            message: 'Muitas contas criadas a partir deste IP. Tente novamente mais tarde.',
            error: 'Muitas contas criadas a partir deste IP. Tente novamente mais tarde.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

/**
 * passwordResetLimiter: Limita solicitações de recuperação de senha.
 * Isolado do login para garantir que o usuário consiga recuperar o acesso mesmo se bloqueado no login.
 */
export const passwordResetLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        limit: 3,
        message: {
            success: false,
            message: 'Muitas solicitações de redefinição de senha. Verifique seu e-mail ou tente novamente em 15 minutos.',
            error: 'Muitas solicitações de redefinição de senha. Verifique seu e-mail ou tente novamente em 15 minutos.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

/**
 * generalLimiter: Limitador genérico para outras rotas da API.
 */
export const generalLimiter = isTest
    ? passThrough
    : rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        limit: 100,
        message: {
            success: false,
            message: 'Muitas requisições. Tente novamente em 15 minutos.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });