import { Router } from 'express';
import type { Router as ExpressRouter, RequestHandler } from 'express';
import { register, login, getProfile, getPreferences, updatePreferences, forgotPassword, resetPassword, resetPasswordDeepLink } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { loginLimiter, registerLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation/authValidation';

const router: ExpressRouter = Router();

// Wrappers para compatibilidade de tipos com Express (evita erros de tipagem com express-rate-limit)
const loginMw = loginLimiter as unknown as RequestHandler;
const registerMw = registerLimiter as unknown as RequestHandler;
const passwordResetMw = passwordResetLimiter as unknown as RequestHandler;

// Rotas públicas com rate limiting isolado por funcionalidade
router.post('/register', registerMw, validate(registerSchema), register);
router.post('/login', loginMw, validate(loginSchema), login);
router.post('/forgot-password', passwordResetMw, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetMw, validate(resetPasswordSchema), resetPassword);
// Página intermediária para abrir o app via deep link (GET)
router.get('/reset-password/:token', resetPasswordDeepLink);

// Rotas protegidas
router.get('/profile', authMiddleware, getProfile);
router.get('/preferences', authMiddleware, getPreferences);
router.put('/preferences', authMiddleware, updatePreferences);

export default router;